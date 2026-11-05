// Mengubah semua PNG di public/assets/images menjadi WebP (kualitas 90, alpha 100), lalu menghapus PNG-nya.
// Dijalankan setelah skrip pemroses aset (process-assets-v2.mjs / process-gifts-green-pink.mjs), yang masih
// menulis PNG sebagai hasil antara:
//   node tools/convert-to-webp.mjs
// Aman dijalankan berulang (tidak ada PNG = tidak melakukan apa-apa).
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const DIR = 'public/assets/images'
let before = 0, after = 0, n = 0
for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith('.png'))) {
  const src = path.join(DIR, f)
  const dst = path.join(DIR, f.replace(/\.png$/, '.webp'))
  const buf = await sharp(src).webp({ quality: 90, alphaQuality: 100, effort: 5 }).toBuffer()
  before += fs.statSync(src).size
  after += buf.length
  fs.writeFileSync(dst, buf)
  fs.unlinkSync(src)
  n++
}
console.log(`${n} file: ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB`)
