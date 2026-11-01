// Utilitas dev: gambar grid koordinat untuk sprite karakter -> satu gambar gabungan
import sharp from 'sharp'
const [outFile, ...names] = process.argv.slice(2)
const meta = JSON.parse((await import('node:fs')).readFileSync('tools/sprite-meta-v2.json', 'utf8')).chars
const parts = []
let x = 0, H = 0
for (const n of names) {
  const { width: w, height: h } = meta[n]
  const base = await sharp(`public/assets/images/char-${n}.png`).flatten({ background: '#d96fd0' }).png().toBuffer()
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">`
  for (let g = 0; g < w; g += 50) svg += `<line x1="${g}" y1="0" x2="${g}" y2="${h}" stroke="#fff" stroke-opacity=".5"/><text x="${g + 2}" y="12" font-size="12" fill="#fff">${g}</text>`
  for (let g = 0; g < h; g += 50) svg += `<line x1="0" y1="${g}" x2="${w}" y2="${g}" stroke="cyan" stroke-opacity=".5"/><text x="2" y="${g - 2}" font-size="12" fill="cyan">${g}</text>`
  svg += '</svg>'
  parts.push({ input: await sharp(base).composite([{ input: Buffer.from(svg) }]).png().toBuffer(), left: x, top: 0 })
  x += w + 8; H = Math.max(H, h)
}
await sharp({ create: { width: x, height: H, channels: 3, background: '#222' } }).composite(parts).png().toFile(outFile)
