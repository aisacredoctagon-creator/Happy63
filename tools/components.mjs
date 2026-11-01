// Utilitas dev: daftar komponen terhubung (bbox) dari kanal alpha sebuah PNG.
// pakai: node tools/components.mjs <file> [minArea] [alphaThreshold]
import sharp from 'sharp'
const [file, minArea = '2000', thr = '20'] = process.argv.slice(2)
const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: w, height: h } = info
const lab = new Int32Array(w * h)
let id = 0
const out = []
for (let s = 0; s < w * h; s++) {
  if (lab[s] || data[s * 4 + 3] <= +thr) continue
  id++
  let n = 0, x0 = w, y0 = h, x1 = 0, y1 = 0
  const st = [s]; lab[s] = id
  while (st.length) {
    const i = st.pop(); n++
    const x = i % w, y = (i / w) | 0
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
    for (const j of [i - 1, i + 1, i - w, i + w]) {
      if (j < 0 || j >= w * h) continue
      if ((j === i - 1 && x === 0) || (j === i + 1 && x === w - 1)) continue
      if (!lab[j] && data[j * 4 + 3] > +thr) { lab[j] = id; st.push(j) }
    }
  }
  if (n >= +minArea) out.push({ id, area: n, x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 })
}
console.log(w, h, JSON.stringify(out))
