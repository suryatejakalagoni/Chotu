// Generates PWA icons from the owl SVG using sharp.
// Run: node scripts/gen-owl-icons.mjs

import sharp from 'sharp'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../public/icons')
mkdirSync(outDir, { recursive: true })

// ── Static owl SVG (idle state, no JS interactivity) ──────────────
// viewBox="-12 0 124 134" → we embed in a 512×512 canvas with a warm
// cream/orange background matching the landing page palette.
const BG = '#F5F0E8'   // warm cream — matches landing gradient
const PADDING = 72     // pixels of padding inside the 512 canvas

const svg512 = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <!-- background -->
  <rect width="512" height="512" rx="96" fill="${BG}"/>
  <!-- owl centered with padding -->
  <g transform="translate(${PADDING}, ${PADDING}) scale(${(512 - PADDING * 2) / 124})">
    <!-- translate to account for viewBox x offset of -12 -->
    <g transform="translate(12, 0)">
      <!-- body -->
      <ellipse cx="50" cy="78" rx="50" ry="54" fill="#D98A4E" stroke="#8B5E3C" stroke-width="3"/>
      <!-- ear tufts -->
      <path d="M 8 36 Q 16 2 38 28 Z"  fill="#D98A4E" stroke="#8B5E3C" stroke-width="3"/>
      <path d="M 92 36 Q 84 2 62 28 Z" fill="#D98A4E" stroke="#8B5E3C" stroke-width="3"/>
      <!-- face disc -->
      <ellipse cx="50" cy="88" rx="33" ry="35" fill="#F5DEB8"/>
      <!-- eye whites -->
      <circle cx="35" cy="66" r="16" fill="#fff" stroke="#8B5E3C" stroke-width="2"/>
      <circle cx="65" cy="66" r="16" fill="#fff" stroke="#8B5E3C" stroke-width="2"/>
      <!-- pupils (idle — centred) -->
      <circle cx="38" cy="69" r="8"   fill="#3a2a1a"/>
      <circle cx="68" cy="69" r="8"   fill="#3a2a1a"/>
      <circle cx="41" cy="66" r="2.6" fill="#fff"/>
      <circle cx="71" cy="66" r="2.6" fill="#fff"/>
      <!-- beak -->
      <path d="M 44 82 L 50 90 L 56 82 Z" fill="#E8954F" stroke="#8B5E3C" stroke-width="2"/>
      <!-- wings (down / idle) -->
      <path d="M 12 84 Q 2 90 0 102 Q -1 112 7 114 Q 15 116 17 106 Q 19 94 12 84 Z"
            fill="#D98A4E" stroke="#8B5E3C" stroke-width="2.5"/>
      <path d="M 88 84 Q 98 90 100 102 Q 101 112 93 114 Q 85 116 83 106 Q 81 94 88 84 Z"
            fill="#D98A4E" stroke="#8B5E3C" stroke-width="2.5"/>
      <!-- belly feather hints -->
      <path d="M 38 116 Q 44 124 50 116" fill="none" stroke="#8B5E3C" stroke-width="2"/>
      <path d="M 50 116 Q 56 124 62 116" fill="none" stroke="#8B5E3C" stroke-width="2"/>
    </g>
  </g>
</svg>`

// Maskable icon: full-bleed background, owl fits in the centre safe zone
// (inner 80% of the canvas — Google/Android safe zone spec)
const MASK_PAD = 130
const svg512mask = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${BG}"/>
  <g transform="translate(${MASK_PAD}, ${MASK_PAD}) scale(${(512 - MASK_PAD * 2) / 124})">
    <g transform="translate(12, 0)">
      <ellipse cx="50" cy="78" rx="50" ry="54" fill="#D98A4E" stroke="#8B5E3C" stroke-width="3"/>
      <path d="M 8 36 Q 16 2 38 28 Z"  fill="#D98A4E" stroke="#8B5E3C" stroke-width="3"/>
      <path d="M 92 36 Q 84 2 62 28 Z" fill="#D98A4E" stroke="#8B5E3C" stroke-width="3"/>
      <ellipse cx="50" cy="88" rx="33" ry="35" fill="#F5DEB8"/>
      <circle cx="35" cy="66" r="16" fill="#fff" stroke="#8B5E3C" stroke-width="2"/>
      <circle cx="65" cy="66" r="16" fill="#fff" stroke="#8B5E3C" stroke-width="2"/>
      <circle cx="38" cy="69" r="8"   fill="#3a2a1a"/>
      <circle cx="68" cy="69" r="8"   fill="#3a2a1a"/>
      <circle cx="41" cy="66" r="2.6" fill="#fff"/>
      <circle cx="71" cy="66" r="2.6" fill="#fff"/>
      <path d="M 44 82 L 50 90 L 56 82 Z" fill="#E8954F" stroke="#8B5E3C" stroke-width="2"/>
      <path d="M 12 84 Q 2 90 0 102 Q -1 112 7 114 Q 15 116 17 106 Q 19 94 12 84 Z"
            fill="#D98A4E" stroke="#8B5E3C" stroke-width="2.5"/>
      <path d="M 88 84 Q 98 90 100 102 Q 101 112 93 114 Q 85 116 83 106 Q 81 94 88 84 Z"
            fill="#D98A4E" stroke="#8B5E3C" stroke-width="2.5"/>
      <path d="M 38 116 Q 44 124 50 116" fill="none" stroke="#8B5E3C" stroke-width="2"/>
      <path d="M 50 116 Q 56 124 62 116" fill="none" stroke="#8B5E3C" stroke-width="2"/>
    </g>
  </g>
</svg>`

async function generate() {
  const buf512 = Buffer.from(svg512)
  const bufMask = Buffer.from(svg512mask)

  // icon-512.png
  await sharp(buf512).resize(512, 512).png().toFile(join(outDir, 'icon-512.png'))
  console.log('✓ icon-512.png')

  // icon-192.png
  await sharp(buf512).resize(192, 192).png().toFile(join(outDir, 'icon-192.png'))
  console.log('✓ icon-192.png')

  // apple-touch-icon.png (180×180, same design)
  await sharp(buf512).resize(180, 180).png().toFile(join(outDir, 'apple-touch-icon.png'))
  console.log('✓ apple-touch-icon.png')

  // icon-maskable-512.png (full-bleed, safe-zone)
  await sharp(bufMask).resize(512, 512).png().toFile(join(outDir, 'icon-maskable-512.png'))
  console.log('✓ icon-maskable-512.png')

  console.log('\nAll icons written to public/icons/')
}

generate().catch(err => { console.error(err); process.exit(1) })
