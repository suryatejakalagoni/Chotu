/**
 * Web Worker: rasterize a PDF into per-page JPEG images then rebuild as PDF.
 *
 * Keeps the heavy pdfjs + canvas work off the main thread.
 *
 * Protocol
 * ────────
 * IN  { type: 'compress', id: string, buffer: ArrayBuffer }
 * OUT { type: 'progress', id, page: number, total: number, attemptIndex: number }
 *     { type: 'done',     id, buffer: ArrayBuffer }
 *     { type: 'error',    id, message: string }
 */

import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument } from 'pdf-lib'

// webpack sees `new URL(literal, import.meta.url)` and emits the pdfjs decode
// worker as a separate static asset (same-origin → satisfies CSP worker-src 'self').
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

// ── Worker-global type shim ───────────────────────────────────
// TypeScript's dom lib types `self` as Window; inside a worker it is
// DedicatedWorkerGlobalScope.  We alias globalThis with a minimal interface
// so postMessage(msg, [transfer]) type-checks correctly.
interface _WorkerScope {
  addEventListener(type: 'message', cb: (e: MessageEvent) => void): void
  postMessage(message: unknown, transfer?: Transferable[]): void
}
const wSelf = globalThis as unknown as _WorkerScope

// ── Constants ─────────────────────────────────────────────────

const MAX_BYTES = 10 * 1024 * 1024  // 10 MB hard cap

// Rasterisation ladder: [scale, quality]
// Start high-quality, step down to the floor at scale=1.0, quality=0.35.
const ATTEMPTS: ReadonlyArray<{ scale: number; quality: number }> = [
  { scale: 1.5, quality: 0.70 },
  { scale: 1.5, quality: 0.50 },
  { scale: 1.5, quality: 0.35 },
  { scale: 1.2, quality: 0.50 },
  { scale: 1.2, quality: 0.35 },
  { scale: 1.0, quality: 0.50 },
  { scale: 1.0, quality: 0.35 },  // minimum floor
]

// ── Types ─────────────────────────────────────────────────────

type PageImage = { bytes: Uint8Array; w: number; h: number }

// ── Render one page → JPEG bytes ──────────────────────────────

async function renderPage(
  page: pdfjsLib.PDFPageProxy,
  scale: number,
  quality: number,
): Promise<PageImage> {
  const vp = page.getViewport({ scale })
  const w  = Math.max(1, Math.floor(vp.width))
  const h  = Math.max(1, Math.floor(vp.height))

  const canvas = new OffscreenCanvas(w, h)
  // pdfjs-dist 5.x: `canvas` is the new primary param; when using the legacy
  // `canvasContext` path, canvas must be null.  OffscreenCanvasRenderingContext2D
  // implements the same interface as CanvasRenderingContext2D at runtime.
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D
  if (!ctx) throw new Error(`Could not acquire 2D context for page ${page.pageNumber}`)

  await page.render({ canvas: null, canvasContext: ctx, viewport: vp }).promise

  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality })
  return { bytes: new Uint8Array(await blob.arrayBuffer()), w, h }
}

// ── Rebuild PDF from JPEG images using pdf-lib ────────────────

async function buildPdf(images: PageImage[]): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create()
  for (const img of images) {
    const embedded = await doc.embedJpg(img.bytes)
    const page     = doc.addPage([img.w, img.h])
    page.drawImage(embedded, { x: 0, y: 0, width: img.w, height: img.h })
  }
  const u8 = await doc.save({ useObjectStreams: true })
  // u8.buffer may be a SharedArrayBuffer or have byteOffset != 0.
  // Copy into a plain, zero-offset ArrayBuffer so it is transferable.
  const out = new ArrayBuffer(u8.byteLength)
  new Uint8Array(out).set(u8)
  return out
}

// ── One attempt at a given scale + quality ────────────────────

async function runAttempt(
  pdf: pdfjsLib.PDFDocumentProxy,
  scale: number,
  quality: number,
  onProgress: (page: number, total: number) => void,
): Promise<ArrayBuffer | null> {
  const n      = pdf.numPages
  const images: PageImage[] = []

  for (let p = 1; p <= n; p++) {
    onProgress(p, n)
    const page = await pdf.getPage(p)
    try {
      images.push(await renderPage(page, scale, quality))
    } finally {
      page.cleanup()
    }
  }

  const result = await buildPdf(images)
  return result.byteLength <= MAX_BYTES ? result : null
}

// ── Main compression entry point ──────────────────────────────

async function compress(
  buffer: ArrayBuffer,
  onProgress: (page: number, total: number, attemptIndex: number) => void,
): Promise<ArrayBuffer> {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise

  for (let i = 0; i < ATTEMPTS.length; i++) {
    const { scale, quality } = ATTEMPTS[i]
    const result = await runAttempt(pdf, scale, quality, (p, t) => onProgress(p, t, i))
    if (result !== null) return result
  }

  throw new Error(
    'Could not compress below 10 MB — please reduce the source file.',
  )
}

// ── Message handler ───────────────────────────────────────────

wSelf.addEventListener('message', async (evt: MessageEvent) => {
  const { type, id, buffer } = evt.data as {
    type: string; id: string; buffer: ArrayBuffer
  }
  if (type !== 'compress') return

  try {
    const result = await compress(buffer, (page, total, attemptIndex) => {
      wSelf.postMessage({ type: 'progress', id, page, total, attemptIndex })
    })

    // Verify output magic bytes before sending back (%PDF = 0x25 0x50 0x44 0x46)
    const hdr = new Uint8Array(result, 0, 4)
    if (!(hdr[0] === 0x25 && hdr[1] === 0x50 && hdr[2] === 0x44 && hdr[3] === 0x46)) {
      throw new Error('Output failed magic-byte check — rebuild produced corrupt PDF.')
    }

    wSelf.postMessage({ type: 'done', id, buffer: result }, [result])
  } catch (err) {
    wSelf.postMessage({
      type: 'error',
      id,
      message: err instanceof Error ? err.message : 'PDF compression failed.',
    })
  }
})

// Ensure webpack treats this as a module (required for import.meta.url)
export {}
