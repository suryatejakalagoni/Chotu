/**
 * Generates placeholder PWA icons (solid forest-green squares).
 * Run once: node scripts/gen-icons.js
 * Replace the output PNGs with proper icons before final launch.
 */
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

function solidPNG(width, height, r, g, b) {
  // CRC32 table
  const crcTable = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crcTable[n] = c
  }
  function crc32(buf) {
    let c = 0xffffffff
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 255] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  function chunk(type, data) {
    const len = Buffer.allocUnsafe(4)
    len.writeUInt32BE(data.length, 0)
    const t = Buffer.from(type, 'ascii')
    const crcBuf = Buffer.allocUnsafe(4)
    crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
    return Buffer.concat([len, t, data, crcBuf])
  }

  // IHDR: width, height, 8-bit depth, RGB colour type
  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  // Raw pixels: filter byte (0) + RGB per pixel
  const rowSize = 1 + width * 3
  const raw = Buffer.allocUnsafe(height * rowSize)
  for (let y = 0; y < height; y++) {
    const row = y * rowSize
    raw[row] = 0 // filter: None
    for (let x = 0; x < width; x++) {
      raw[row + 1 + x * 3] = r
      raw[row + 1 + x * 3 + 1] = g
      raw[row + 1 + x * 3 + 2] = b
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const outDir = path.join(__dirname, '..', 'public', 'icons')
fs.mkdirSync(outDir, { recursive: true })

// Forest green #2C3531 = rgb(44, 53, 49)
const R = 0x2c, G = 0x35, B = 0x31

const sizes = [
  ['icon-192.png',          192, 192],
  ['icon-512.png',          512, 512],
  ['icon-maskable-512.png', 512, 512],
  ['apple-touch-icon.png',  180, 180],
]

for (const [name, w, h] of sizes) {
  fs.writeFileSync(path.join(outDir, name), solidPNG(w, h, R, G, B))
  console.log(`  created public/icons/${name}  (${w}x${h})`)
}

console.log('\nDone. Replace with real icons before final launch.')
