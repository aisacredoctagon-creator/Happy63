// Kado hijau (teal) & pink:
//   Divisi Formal Education & Talent Development = hijau teal (sprite 9), Divisi Material Sosial Media = pink (sprite 10).
// Sumber:
//   - hijau : "Festive Teal Gift Boxes.png"  (satu sheet: kiri = terbuka, kanan = tertutup)
//   - pink  : "Glossy Green and Pink Gift Boxes.png" (tertutup) + "Neon Gift Boxes with Sparkles.png" (terbuka);
//             tiap sheet berisi 2 kado (kiri hijau lama, kanan pink), yang diambil hanya yang pink.
// Hasilnya ditulis ke gift-closed-N.png / gift-open-N.png dan ukurannya ditambahkan ke tools/sprite-meta-v2.json
// (aman dijalankan berulang). Dipisah dari process-assets-v2.mjs agar kado manual (4, 5, 7) tidak tertimpa.
//   node tools/process-gifts-green-pink.mjs   (lalu: node tools/convert-to-webp.mjs, karena aset dipakai sebagai .webp)
import sharp from 'sharp'
import fs from 'node:fs'

const SRC = 'aset proyek'
const OUT = 'public/assets/images'
const CLOSED_H = 316 // tinggi kado tertutup (px), sama dengan kado lain
const OPEN_SCALE_BOOST = 1.25 // kotak pada gambar terbuka lebih kecil dari yang tertutup -> diperbesar sedikit

/** bounding box piksel tak transparan di kolom [xa, xb) */
async function boxIn(file, xa, xb) {
  const { data, info } = await sharp(`${SRC}/${file}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height
  xb = Math.min(xb ?? W, W)
  let x0 = W, y0 = H, x1 = 0, y1 = 0
  for (let y = 0; y < H; y++) for (let x = xa; x < xb; x++) {
    if (data[(y * W + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1, W }
}
const mid = async (file) => (await sharp(`${SRC}/${file}`).metadata()).width >> 1

const teal = 'Festive Teal Gift Boxes.png'
const closedSheet = 'Glossy Green and Pink Gift Boxes.png'
const openSheet = 'Neon Gift Boxes with Sparkles.png'
const defs = [
  { idx: 9, closed: [teal, await boxIn(teal, await mid(teal))], open: [teal, await boxIn(teal, 0, await mid(teal))] },
  { idx: 10, closed: [closedSheet, await boxIn(closedSheet, await mid(closedSheet))], open: [openSheet, await boxIn(openSheet, await mid(openSheet))] },
]

const meta = JSON.parse(fs.readFileSync('tools/sprite-meta-v2.json', 'utf8'))
for (const { idx, closed, open } of defs) {
  const [cf, cb] = closed, [of, ob] = open
  const { W: _c, ...cbox } = cb, { W: _o, ...obox } = ob
  const s = CLOSED_H / cbox.height
  const cw = Math.round(cbox.width * s)
  const sOpen = s * OPEN_SCALE_BOOST
  const ow = Math.round(obox.width * sOpen), oh = Math.round(obox.height * sOpen)
  await sharp(`${SRC}/${cf}`).extract(cbox).resize({ width: cw, height: CLOSED_H }).png({ compressionLevel: 9 }).toFile(`${OUT}/gift-closed-${idx}.png`)
  await sharp(`${SRC}/${of}`).extract(obox).resize({ width: ow, height: oh }).png({ compressionLevel: 9 }).toFile(`${OUT}/gift-open-${idx}.png`)
  meta.gifts[idx] = { closed: [cw, CLOSED_H], open: [ow, oh] }
  console.log(idx, meta.gifts[idx])
}
fs.writeFileSync('tools/sprite-meta-v2.json', JSON.stringify(meta, null, 2))
