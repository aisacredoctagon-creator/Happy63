// Memproses gambar referensi di "aset proyek/" menjadi aset siap pakai di public/assets/images/.
// Sprite terpisah (Gasing, pesawat) dipotong otomatis dan latar yang ditinggalkan ditambal (inpaint).
// TODO: ganti dengan sprite/layer asli (PNG transparan) bila sudah tersedia - cukup timpa file hasilnya.
//
//   npm run assets
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import {
  loadRGB, polyMask, rectMask, ellipseMask, union, intersect, subtract, dilate, erode, close, fillHoles, largestComponent,
  bbox, inpaint, inpaintRows, composeFill, cutSprite, rgbaToSharp, softAlpha,
} from './imgtools.mjs'

const SRC = 'aset proyek'
const OUT = 'public/assets/images'
fs.mkdirSync(OUT, { recursive: true })
const meta = {}

// aset di bawah sudah DIGANTI aset baru (tools/process-visual.mjs, npm run assets:visual) dan filenya dihapus: jangan ditulis ulang
export const RETIRED = new Set(['scene2-bg.webp', 'scene2-plane.png', 'scene5-bg.webp', 'scene6-tv.webp', 'bandara.webp'])
const saveWebp = (img, name, q = 92) => (RETIRED.has(name) ? Promise.resolve() : img.webp({ quality: q, effort: 5 }).toFile(path.join(OUT, name)))
const saveSprite = async (name, s) => {
  if (RETIRED.has(name)) return
  await sharp(s.buf, { raw: { width: s.width, height: s.height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(OUT, name))
}

/* ------------------------------------------------------------------ Scene 1: perpanjang jadi 16:9 */
{
  const file = `${SRC}/Scene 1.png`
  const { data, w, h } = await loadRGB(file)
  const H = Math.round((w * 9) / 16)
  const ext = Math.floor((H - h) / 2)
  const top = await sharp(file).extract({ left: 0, top: 0, width: w, height: 2 }).resize(w, ext, { fit: 'fill' }).blur(30).toBuffer()
  const bot = await sharp(file).extract({ left: 0, top: h - 2, width: w, height: 2 }).resize(w, H - h - ext, { fit: 'fill' }).blur(30).toBuffer()
  // vignette halus supaya pita perpanjangan tidak datar
  const grad = (y0, y1, a0, a1) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${y1 - y0}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1230" stop-opacity="${a0}"/><stop offset="1" stop-color="#0a1230" stop-opacity="${a1}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`)
  const topFull = await sharp(top).composite([{ input: grad(0, ext, 0.55, 0) }]).png().toBuffer()
  const botFull = await sharp(bot).composite([{ input: grad(0, H - h - ext, 0, 0.6) }]).png().toBuffer()
  const plate = await sharp({ create: { width: w, height: H, channels: 3, background: '#000' } })
    .composite([
      { input: topFull, left: 0, top: 0 },
      { input: file, left: 0, top: ext },
      { input: botFull, left: 0, top: ext + h },
    ]).png().toBuffer()
  await saveWebp(sharp(plate), 'scene1.webp')
  meta.scene1 = { width: w, height: H, offsetY: ext, srcHeight: h }
  console.log('scene1', w, H, 'ext', ext)
}

/* ------------------------------------------------------------------ Scene 2: pesawat */
{
  const { data, w, h } = await loadRGB(`${SRC}/Scene 2.png`)
  // poligon longgar mengelilingi pesawat
  const poly = [[486,336],[540,334],[560,360],[612,414],[650,428],[768,416],[772,388],[800,388],[832,420],[940,408],[1090,402],[1142,408],[1190,432],[1216,458],[1222,478],[1192,502],[1150,516],[1000,534],[975,545],[965,562],[940,575],[892,590],[840,575],[790,565],[742,566],[702,558],[716,545],[600,540],[560,528],[498,505],[452,486],[452,468],[500,462],[512,452],[508,420]]
  const region = polyMask(w, h, poly)
  // perkiraan langit: isi region dengan difusi dari sekitar
  const sky = inpaint(data, w, h, dilate(region, w, h, 1), 700)
  const diff = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    if (!region[i]) continue
    const d = Math.hypot(data[i * 3] - sky[i * 3], data[i * 3 + 1] - sky[i * 3 + 1], data[i * 3 + 2] - sky[i * 3 + 2])
    if (d > 26) diff[i] = 1
  }
  let mask = close(diff, w, h, 3)
  mask = fillHoles(mask, w, h)
  mask = largestComponent(mask, w, h)
  // seluruh poligon + garis angin di sekitar ekor ikut dihapus (garis angin digambar ulang sebagai animasi)
  const holeMask = union(dilate(mask, w, h, 5), dilate(region, w, h, 2), rectMask(w, h, 235, 396, 530, 522))
  const filled = inpaint(data, w, h, holeMask, 800)
  const bg = await composeFill(data, filled, w, h, holeMask, 2)
  await saveWebp(rgbaToSharp(bg, w, h), 'scene2-bg.webp')
  const spr = await cutSprite(data, w, h, erode(mask, w, h, 1), 4, 0.8)
  await saveSprite('scene2-plane.png', spr)
  meta.scene2Plane = { x: spr.x, y: spr.y, width: spr.width, height: spr.height, bgWidth: w, bgHeight: h }
  console.log('scene2 plane', meta.scene2Plane)
}

/* ------------------------------------------------------------------ Scene 3: pesawat + kado */
{
  const { data, w, h } = await loadRGB(`${SRC}/Scene 3.png`)
  const poly = [[150,178],[171,168],[176,170],[220,205],[258,195],[268,180],[272,150],[282,150],[286,166],[300,152],[312,153],[326,170],[330,186],[352,188],[374,198],[384,216],[376,236],[350,244],[335,252],[290,272],[262,274],[250,262],[200,262],[150,270],[116,252],[116,240],[150,230],[160,226],[150,200]]
  const region = polyMask(w, h, poly)
  const sky = inpaint(data, w, h, dilate(region, w, h, 1), 700)
  const diff = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    if (!region[i]) continue
    const d = Math.hypot(data[i * 3] - sky[i * 3], data[i * 3 + 1] - sky[i * 3 + 1], data[i * 3 + 2] - sky[i * 3 + 2])
    if (d > 28) diff[i] = 1
  }
  let planeMask = fillHoles(close(diff, w, h, 3), w, h)
  planeMask = largestComponent(planeMask, w, h)
  // jejak awan (contrail) di kiri pesawat ikut dihapus dari latar
  const contrail = rectMask(w, h, 0, 186, 165, 292)
  const planeHole = union(dilate(planeMask, w, h, 5), contrail)

  // kado: ukuran sekitar 62-75 px; hapus supaya bisa diganti ikon kado interaktif
  const gifts = [
    [246, 489, 66, 66], [339, 581, 74, 72], [700, 568, 74, 74], [897, 628, 74, 72], [630, 733, 80, 78],
    [815, 778, 68, 68], [1135, 632, 70, 70], [1399, 613, 76, 74], [1517, 702, 74, 74],
  ]
  let giftHole = new Uint8Array(w * h)
  for (const [cx, cy, gw, gh] of gifts) giftHole = union(giftHole, rectMask(w, h, cx - gw / 2 - 3, cy - gh / 2 - 3, cx + gw / 2 + 3, cy + gh / 2 + 3))

  const hole = union(planeHole, giftHole)
  const filled = inpaint(data, w, h, hole, 900)
  const bg = await composeFill(data, filled, w, h, hole, 2)
  await saveWebp(rgbaToSharp(bg, w, h), 'scene3-bg.webp')
  const spr = await cutSprite(data, w, h, erode(planeMask, w, h, 1), 4, 0.8)
  await saveSprite('scene3-plane.png', spr)
  meta.scene3Plane = { x: spr.x, y: spr.y, width: spr.width, height: spr.height, bgWidth: w, bgHeight: h }
  console.log('scene3 plane', meta.scene3Plane)
}

/* ------------------------------------------------------------------ Scene 4 & 5: Gasing + latar bandara */
async function airport(sceneNo, box, spriteName, opts = {}) {
  const { data, w, h } = await loadRGB(`${SRC}/Scene ${sceneNo}.png`)
  const [bx0, by0, bx1, by1] = box
  const region = rectMask(w, h, bx0, by0, bx1, by1)
  const body = new Uint8Array(w * h)
  for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
    const i = y * w + x, r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2]
    const green = g > b + 80 && g >= r - 4
    const brown = r > b + 22 && r < 140 && g < 115 && b < 70
    if (green || brown) body[i] = 1
  }
  // mata menonjol keluar siluet hijau: tambahkan elips mata secara eksplisit (koordinat dari grid)
  for (const [cx, cy, rx, ry] of opts.eyes || []) {
    const e = ellipseMask(w, h, cx, cy, rx, ry)
    for (let i = 0; i < e.length; i++) if (e[i]) body[i] = 1
  }
  let mask = close(body, w, h, 5)
  mask = fillHoles(mask, w, h)
  mask = largestComponent(mask, w, h)
  const bb = bbox(mask, w, h)

  // bayangan + pantulan di lantai
  const feet = bb.y1
  const shadow = new Uint8Array(w * h)
  const refl = new Uint8Array(w * h)
  for (let y = feet - 40; y <= Math.min(h - 1, feet + 190); y++) for (let x = bb.x0 - 30; x <= bb.x1 + 30; x++) {
    const i = y * w + x
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2]
    const lum = 0.3 * r + 0.59 * g + 0.11 * b
    if (!mask[i] && y > feet - 30 && y < feet + 40 && lum < 185) shadow[i] = 1
    if (y > feet - 10 && r - b > 16) refl[i] = 1
  }
  const extra = union(close(dilate(shadow, w, h, 3), w, h, 6), close(dilate(refl, w, h, 4), w, h, 8))
  let hole = union(dilate(mask, w, h, 7), opts.extraHole ? opts.extraHole(w, h) : new Uint8Array(w * h), extra)
  hole = close(hole, w, h, 3)
  const filled = inpaintRows(data, w, h, hole)
  const bg = await composeFill(data, filled, w, h, hole, 3)
  await saveWebp(rgbaToSharp(bg, w, h), `scene${sceneNo}-bg.webp`)
  const spr = await cutSprite(data, w, h, erode(mask, w, h, 1), 4, 0.8)
  await saveSprite(spriteName, spr)
  const info = { x: spr.x, y: spr.y, width: spr.width, height: spr.height, feetY: feet, bgWidth: w, bgHeight: h }
  console.log(`scene${sceneNo}`, info)
  return info
}
meta.gasingS4 = await airport(4, [470, 380, 780, 700], 'gasing.png', {
  eyes: [[625, 498, 27, 41], [678, 486, 24, 36]],
  extraHole: (w, h) => rectMask(w, h, 588, 426, 672, 470),
})
// tanda seru kuning di Scene 5 ikut dihapus dari latar (digambar ulang sebagai SVG)
meta.gasingS5 = await airport(5, [395, 415, 670, 715], 'gasing-s5.png', {
  eyes: [[550, 525, 26, 32], [581, 515, 22, 30]],
  extraHole: (w, h) => union(dilate(rectMask(w, h, 585, 420, 655, 485), w, h, 2), rectMask(w, h, 546, 462, 574, 486)),
})

/* ------------------------------------------------------------------ Scene 6: bingkai TV */
await saveWebp(sharp(`${SRC}/Scene 6.png`), 'scene6-tv.webp')

fs.writeFileSync('tools/sprite-meta.json', JSON.stringify(meta, null, 2))
console.log('selesai')
