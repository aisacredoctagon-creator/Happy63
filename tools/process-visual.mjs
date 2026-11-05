// Memproses aset visual baru dari "aset proyek/" ke public/assets/images (nama tanpa spasi, webp, bersih).
//   npm run assets:visual
// - pesawat: bersihkan bintik/serpihan di tepi alpha, potong ke bounding box, antialias tepi
// - maskot (badan Glossy, alert, mirrored), mata terbuka/tertutup topi, dan potongan mata+alis pose kaget: bersihkan serpihan alpha, ubah ke webp
// - latar (langit, bagasi, lobi) dan monitor TV: webp
// Video diproses terpisah oleh tools/process-video.mjs
import { mkdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(root, 'aset proyek')
const OUT = join(root, 'public', 'assets', 'images')
mkdirSync(OUT, { recursive: true })

/** komponen terhubung (4-arah) pada mask biner; kembalikan label per piksel dan luas tiap label */
function components(mask, w, h) {
  const label = new Int32Array(w * h)
  const areas = [0]
  const stack = new Int32Array(w * h)
  let n = 0
  for (let i = 0; i < w * h; i++) {
    if (!mask[i] || label[i]) continue
    n++
    let sp = 0
    let area = 0
    stack[sp++] = i
    label[i] = n
    while (sp) {
      const p = stack[--sp]
      area++
      const x = p % w
      const y = (p / w) | 0
      if (x > 0 && mask[p - 1] && !label[p - 1]) (label[p - 1] = n), (stack[sp++] = p - 1)
      if (x < w - 1 && mask[p + 1] && !label[p + 1]) (label[p + 1] = n), (stack[sp++] = p + 1)
      if (y > 0 && mask[p - w] && !label[p - w]) (label[p - w] = n), (stack[sp++] = p - w)
      if (y < h - 1 && mask[p + w] && !label[p + w]) (label[p + w] = n), (stack[sp++] = p + w)
    }
    areas.push(area)
  }
  return { label, areas }
}

/** erosi/dilasi persegi berjari-jari r (dipisah per sumbu agar cepat) */
function morph(mask, w, h, r, erode) {
  const tmp = new Uint8Array(w * h)
  const out = new Uint8Array(w * h)
  const want = erode ? 1 : 0
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let hit = erode
      for (let k = -r; k <= r && (erode ? hit : !hit); k++) {
        const xx = x + k
        const v = xx < 0 || xx >= w ? 0 : mask[y * w + xx]
        if (erode ? !v : v) hit = !erode
      }
      tmp[y * w + x] = hit ? 1 : 0
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let hit = erode
      for (let k = -r; k <= r && (erode ? hit : !hit); k++) {
        const yy = y + k
        const v = yy < 0 || yy >= h ? 0 : tmp[yy * w + x]
        if (erode ? !v : v) hit = !erode
      }
      out[y * w + x] = hit ? 1 : 0
    }
  void want
  return out
}

/**
 * Bersihkan alpha: buang bintik/serpihan terpisah, buang tonjolan tipis (opening), lalu antialias tepi.
 * Warna piksel tepi yang terkontaminasi (halo gelap) diganti warna piksel solid terdekat di dalam.
 */
async function cleanRgba(file, { open = 2, keep = 0.01, thr = 110, inset = 1 } = {}) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const n = w * h
  let mask = new Uint8Array(n)
  for (let i = 0; i < n; i++) mask[i] = data[i * 4 + 3] >= thr ? 1 : 0
  // opening: buang tonjolan/serpihan tipis yang menempel
  if (open > 0) {
    mask = morph(morph(mask, w, h, open, true), w, h, open, false)
  }
  // buang komponen kecil terpisah
  const { label, areas } = components(mask, w, h)
  const biggest = Math.max(...areas)
  const ok = areas.map((a) => a >= biggest * keep)
  for (let i = 0; i < n; i++) if (mask[i] && !ok[label[i]]) mask[i] = 0
  // isi lubang kecil di dalam (komponen latar yang tidak menyentuh tepi gambar)
  const inv = new Uint8Array(n)
  for (let i = 0; i < n; i++) inv[i] = mask[i] ? 0 : 1
  const bg = components(inv, w, h)
  const edgeLabels = new Set()
  for (let x = 0; x < w; x++) (edgeLabels.add(bg.label[x]), edgeLabels.add(bg.label[(h - 1) * w + x]))
  for (let y = 0; y < h; y++) (edgeLabels.add(bg.label[y * w]), edgeLabels.add(bg.label[y * w + w - 1]))
  for (let i = 0; i < n; i++) if (!mask[i] && !edgeLabels.has(bg.label[i]) && bg.areas[bg.label[i]] < 4000) mask[i] = 1
  // inset: rapatkan tepi supaya halo terbuang
  const solid = inset > 0 ? morph(mask, w, h, inset, true) : mask
  // alpha lembut dari mask (blur kecil) -> tepi antialias
  const maskBuf = Buffer.alloc(n)
  for (let i = 0; i < n; i++) maskBuf[i] = solid[i] ? 255 : 0
  const soft = await sharp(maskBuf, { raw: { width: w, height: h, channels: 1 } }).blur(1.1).extractChannel(0).raw().toBuffer()
  // warna: piksel di luar "solid" memakai warna piksel solid terdekat (sebar per lapis)
  const rgb = Buffer.alloc(n * 3)
  const have = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    if (solid[i]) {
      rgb[i * 3] = data[i * 4]
      rgb[i * 3 + 1] = data[i * 4 + 1]
      rgb[i * 3 + 2] = data[i * 4 + 2]
      have[i] = 1
    }
  }
  for (let pass = 0; pass < 6; pass++) {
    const add = []
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x
        if (have[i]) continue
        const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1].filter((j) => j >= 0 && have[j])
        if (!nb.length) continue
        let r = 0, g = 0, b = 0
        for (const j of nb) (r += rgb[j * 3]), (g += rgb[j * 3 + 1]), (b += rgb[j * 3 + 2])
        add.push([i, r / nb.length, g / nb.length, b / nb.length])
      }
    for (const [i, r, g, b] of add) (rgb[i * 3] = r), (rgb[i * 3 + 1] = g), (rgb[i * 3 + 2] = b), (have[i] = 1)
  }
  const outRaw = Buffer.alloc(n * 4)
  for (let i = 0; i < n; i++) {
    outRaw[i * 4] = rgb[i * 3]
    outRaw[i * 4 + 1] = rgb[i * 3 + 1]
    outRaw[i * 4 + 2] = rgb[i * 3 + 2]
    // pertajam sedikit: alpha lembut 0..255 -> kontras sehingga tepi tetap tegas tapi antialias
    const a = soft[i] / 255
    outRaw[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, (a - 0.12) / 0.76)) * 255)
  }
  return sharp(outRaw, { raw: { width: w, height: h, channels: 4 } })
}

const kb = (f) => (statSync(f).size / 1024).toFixed(0) + ' KB'
const report = []
async function save(pipeline, name, srcName, opts = {}) {
  const out = join(OUT, name)
  await pipeline.webp({ quality: opts.q ?? 88, alphaQuality: 100, effort: 6, smartSubsample: true }).toFile(out)
  const src = join(SRC, srcName)
  report.push(`${srcName.padEnd(46)} ${kb(src).padStart(8)}  ->  ${name.padEnd(26)} ${kb(out).padStart(7)}`)
}

// pesawat (tampak samping): bersihkan, trim, 1600 px lebar
{
  const c = await cleanRgba(join(SRC, 'Blue and White Airplane Side View.png'), { open: 3, keep: 0.05, thr: 120, inset: 1 })
  const { data, info } = await c.raw().toBuffer({ resolveWithObject: true })
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3] > 8) (x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y))
  const box = { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }
  const png = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).extract(box).png().toBuffer()
  await save(sharp(png).resize({ width: 1600 }), 'pesawat-samping.webp', 'Blue and White Airplane Side View.png', { q: 90 })
  console.log('pesawat bbox', JSON.stringify(box), 'aspect', (box.width / box.height).toFixed(3))
}
// maskot (badan Glossy, Alert, Mirrored) dan topi: bersihkan serpihan, 900 px lebar (sama dengan gasing.png lama)
for (const [src, out] of [
  ['Glossy Green Spinning Top Mascot.png', 'gasing-badan.webp'],
  ['Alert Green Spinning Top Mascot.png', 'gasing-alert.webp'],
  ['Mirrored Lime Green Spinning Top.png', 'gasing-mirrored.webp'],
]) {
  const c = await cleanRgba(join(SRC, src), { open: 0, keep: 0.002, thr: 60, inset: 0 })
  await save(c.resize({ width: 900 }), out, src, { q: 90 })
}
// mata (terbuka/tertutup): satu kanvas 1536x1024 yang sama, dipotong ke bounding box gabungan yang sama (posisi relatif terjaga), 0,5x
{
  const files = [['Glossy Cartoon Eyes with Arched Brows.png', 'mata-buka.webp'], ['Sleeping Eyes and Arched Brows.png', 'mata-tutup.webp']]
  const raws = []
  for (const [f] of files) raws.push(await sharp(join(SRC, f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true }))
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1
  for (const { data, info } of raws)
    for (let y = 0; y < info.height; y++)
      for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 24) (x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y))
  const box = { left: x0 - 8, top: y0 - 8, width: x1 - x0 + 17, height: y1 - y0 + 17 }
  console.log('mata crop (kanvas 1536x1024)', JSON.stringify(box))
  for (let i = 0; i < files.length; i++) {
    const { data, info } = raws[i]
    for (let j = 0; j < info.width * info.height; j++) if (data[j * 4 + 3] < 24) data[j * 4 + 3] = 0 // buang halo tipis
    const png = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).extract(box).png().toBuffer()
    await save(sharp(png).resize({ width: Math.round(box.width / 2) }), files[i][1], files[i][0], { q: 92 })
  }
}
{
  const c = await cleanRgba(join(SRC, 'Striped Party Hat with Yellow Puffs.png'), { open: 0, keep: 0.002, thr: 60, inset: 0 })
  await save(c.resize({ width: 640 }), 'topi-pesta.webp', 'Striped Party Hat with Yellow Puffs.png', { q: 90 })
}
// mata + alis pose kaget sebagai layer terpisah di atas topi: potongan dari Alert Green Spinning Top Mascot.png (kanvas sama,
// posisi identik). Putih mata ditutup (pupil) lalu diperluas 34 px agar garis tepi dan bayangan ikut; goresan tipis (< 6 px) dibuang; hanya piksel putih/gelap yang diambil (hijau badan tidak).
{
  const { data, info } = await sharp(join(SRC, 'Alert Green Spinning Top Mascot.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const w = info.width, h = info.height
  const lum = (i) => (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3
  const white = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]
    if (data[i * 4 + 3] > 200 && r > 215 && g > 210 && b > 190 && Math.abs(r - b) < 50) white[i] = 1
  }
  // komponen putih terbesar dua (mata kiri dan kanan), lalu dilatasi 16 px
  const { label, areas } = components(white, w, h)
  const order = areas.map((a, i) => [a, i]).sort((x, y) => y[0] - x[0]).slice(0, 3).filter(([a]) => a > 5000).map(([, i]) => i)
  const eyes = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) if (order.includes(label[i])) eyes[i] = 1
  // tutup lubang pupil (dilatasi lalu erosi 40 px), lalu lebarkan 20 px untuk garis tepi dan bayangan
  const closed = morph(morph(eyes, w, h, 40, false), w, h, 40, true)
  const near = morph(closed, w, h, 34, false)
  const keep = new Uint8Array(w * h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (!near[i] || data[i * 4 + 3] < 128) continue
      const l = lum(i)
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]
      const isWhiteish = l > 170 && Math.abs(r - b) < 60 && g - r < 14 && g - b < 70 // putih/abu bayangan mata (bukan hijau muda)
      const isDark = l < 110 && !(g > r + 25) // garis tepi dan pupil (bukan hijau tua)
      if (isWhiteish || isDark) keep[i] = 1
    }
  // alis kiri: goresan gelap kecil di sekitar pangkal tanduk (x 425-545, y 255-370)
  for (let y = 255; y < 370; y++)
    for (let x = 425; x < 545; x++) {
      const i = y * w + x
      if (data[i * 4 + 3] > 128 && lum(i) < 90) keep[i] = 1
    }
  const opened = morph(morph(keep, w, h, 3, true), w, h, 3, false) // buang goresan tipis (garis badan) yang ikut
  for (let i = 0; i < w * h; i++) keep[i] = keep[i] && opened[i] ? 1 : 0
  const comp = components(keep, w, h)
  const big = new Set(comp.areas.map((a, i) => [a, i]).filter(([a]) => a > 250).map(([, i]) => i))
  const maskBuf = Buffer.alloc(w * h)
  for (let i = 0; i < w * h; i++) maskBuf[i] = keep[i] && big.has(comp.label[i]) ? 255 : 0
  const soft = await sharp(maskBuf, { raw: { width: w, height: h, channels: 1 } }).blur(0.7).extractChannel(0).raw().toBuffer()
  const out = Buffer.from(data)
  for (let i = 0; i < w * h; i++) out[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, (soft[i] / 255 - 0.1) / 0.8)) * 255) * (data[i * 4 + 3] > 0 ? 1 : 0)
  await save(sharp(out, { raw: { width: w, height: h, channels: 4 } }).resize({ width: 900 }), 'gasing-alert-mata.webp', 'Alert Green Spinning Top Mascot.png', { q: 92 })
}
// latar dan monitor (RGB): ukuran asli, webp
for (const [src, out, q] of [
  ['Bright Layered Cloudscape.png', 'langit-awan.webp', 84],
  ['Modern Airport Baggage Claim.png', 'bandara-bagasi.webp', 84],
  ['Modern Airport Lobby with Scenic Views.png', 'bandara-lobi.webp', 84],
  ['Hyper-Realistic Dark Screen Monitor.png', 'tv-monitor.webp', 88],
]) {
  await save(sharp(join(SRC, src)).removeAlpha(), out, src, { q })
}
console.log(report.join('\n'))
