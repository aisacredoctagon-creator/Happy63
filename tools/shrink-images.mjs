// Memperkecil resolusi gambar latar besar di public/assets/images supaya memori hasil decode (lebar x tinggi x 4 byte)
// lebih hemat di ponsel. Semua gambar ini ditampilkan dengan ukuran kanvas eksplisit (width/height atau 100%),
// jadi resolusi file tidak memengaruhi tata letak; koordinat piksel di kode tetap mengacu ke ukuran ASLI (config.ts).
// Hanya mengecilkan (tidak pernah membesarkan), jadi aman dijalankan berulang.
//   node tools/shrink-images.mjs
import sharp from 'sharp'
import fs from 'node:fs'
sharp.cache(false) // Windows: jangan menahan handle file yang akan ditimpa

const DIR = 'public/assets/images'
const TARGETS = {
  'transisi.webp': 2000, // awan transisi (aslinya 3000 px)
  // panorama 1983x793
  'bandara.webp': 1600, 'cabin-shell.webp': 1600, 'cabin-windows.webp': 1600, 'scene5-bg.webp': 1600,
  // 16:9 1672x941
  'langit1.webp': 1440, 'scene2-bg.webp': 1440, 'scene3-bg.webp': 1440, 'scene6-tv.webp': 1440,
}
let before = 0, after = 0
for (const [f, w] of Object.entries(TARGETS)) {
  const p = `${DIR}/${f}`
  const input = fs.readFileSync(p)
  const m = await sharp(input).metadata()
  if (m.width <= w) { console.log(f, 'sudah', m.width, 'px, dilewati'); continue }
  const buf = await sharp(input).resize({ width: w, kernel: 'lanczos3' }).webp({ quality: 90, alphaQuality: 100, effort: 5 }).toBuffer()
  const mm = await sharp(buf).metadata()
  before += fs.statSync(p).size
  after += buf.length
  fs.writeFileSync(p, buf)
  console.log(f, `${m.width}x${m.height} -> ${mm.width}x${mm.height}`)
}
console.log(`ukuran file ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB`)
