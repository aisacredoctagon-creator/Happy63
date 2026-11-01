// Utilitas dev: potong area gambar + gambar grid berlabel koordinat asli (px) untuk membaca koordinat.
// pakai: node tools/crop-grid.mjs <file> <x> <y> <w> <h> <zoom> <step> <out.png>
import sharp from 'sharp'
const [file, x, y, w, h, zoom, step, out] = process.argv.slice(2)
const X = +x, Y = +y, W = +w, H = +h, Z = +zoom, S = +step
const base = await sharp(file).extract({ left: X, top: Y, width: W, height: H }).resize(W * Z, H * Z, { kernel: 'nearest' }).toBuffer()
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * Z}" height="${H * Z}">`
for (let gx = Math.ceil(X / S) * S; gx < X + W; gx += S) {
  const px = (gx - X) * Z
  svg += `<line x1="${px}" y1="0" x2="${px}" y2="${H * Z}" stroke="magenta" stroke-width="1" opacity=".55"/><text x="${px + 2}" y="12" font-size="12" fill="magenta" font-family="sans-serif">${gx}</text>`
}
for (let gy = Math.ceil(Y / S) * S; gy < Y + H; gy += S) {
  const py = (gy - Y) * Z
  svg += `<line x1="0" y1="${py}" x2="${W * Z}" y2="${py}" stroke="cyan" stroke-width="1" opacity=".55"/><text x="2" y="${py - 2}" font-size="12" fill="cyan" font-family="sans-serif">${gy}</text>`
}
svg += '</svg>'
await sharp(base).composite([{ input: Buffer.from(svg) }]).png().toFile(out)
