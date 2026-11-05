// Memproses aset desain baru di "aset proyek/" -> public/assets/images/ (sprite terpisah, trim, resize).
//   node tools/process-assets-v2.mjs
import sharp from 'sharp'
import fs from 'node:fs'

const SRC = 'aset proyek'
const OUT = 'public/assets/images'
fs.mkdirSync(OUT, { recursive: true })
const meta = {}

const need = [
  'Character GASING.png', 'awan.png', 'awan2.png', 'Transisi.webp', 'Giftbox1.png', 'Giftbox2.png', 'Maskot Pesawat.png',
  'langit1.png', 'Bandara.png', 'Baggage.png', 'Pulau.png', 'Dalam Pesawat.png', 'Airplane Seat Cartoon Character Cutouts.png',
]
for (const f of need) if (!fs.existsSync(`${SRC}/${f}`)) throw new Error(`Aset tidak ditemukan: ${SRC}/${f}`)

const png = (img, name) => img.png({ compressionLevel: 9 }).toFile(`${OUT}/${name}`)
const webp = (img, name, q = 90) => img.webp({ quality: q, alphaQuality: 95, effort: 5 }).toFile(`${OUT}/${name}`)

/** bounding box alpha > thr */
async function alphaBox(file, thr = 12) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let x0 = info.width, y0 = info.height, x1 = 0, y1 = 0
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > thr) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }
}

// ---- Gasing (sprite utama, diperkecil dari 14171x16913)
{
  const f = `${SRC}/Character GASING.png`
  const box = await alphaBox(f)
  const img = sharp(f, { limitInputPixels: false }).extract(box).resize({ width: 900 })
  await png(img, 'gasing.png')
  const m = await sharp(`${OUT}/gasing.png`).metadata()
  meta.gasing = { width: m.width, height: m.height }
}

// ---- Awan (alpha) trim
for (const [src, dst] of [['awan.png', 'awan1.webp'], ['awan2.png', 'awan2.webp']]) {
  const f = `${SRC}/${src}`
  const box = await alphaBox(f)
  await webp(sharp(f).extract(box).resize({ width: 1200 }), dst)
  const m = await sharp(`${OUT}/${dst}`).metadata()
  meta[dst] = { width: m.width, height: m.height }
}

// ---- Transisi: satu gambar awan lebar (tengah padat, tepi kiri/kanan transparan), dipakai CloudTransition
await webp(sharp(`${SRC}/Transisi.webp`, { limitInputPixels: false }).resize({ width: 3000 }), 'transisi.webp', 85)
{
  const m = await sharp(`${OUT}/transisi.webp`).metadata()
  meta.transisi = { width: m.width, height: m.height }
}

// ---- Langit, bandara, cabin shell
await webp(sharp(`${SRC}/langit1.png`), 'langit1.webp', 88)
await webp(sharp(`${SRC}/Bandara.png`), 'bandara.webp', 92)
// peta pulau (latar Scene Kado): pesawat sudah terpisah, jadi tidak perlu tambal
await webp(sharp(`${SRC}/Pulau.png`), 'scene3-bg.webp', 92)
await webp(sharp(`${SRC}/Dalam Pesawat.png`), 'cabin-shell.webp', 92)

// ---- Maskot pesawat
{
  const f = `${SRC}/Maskot Pesawat.png`
  const box = await alphaBox(f)
  await png(sharp(f).extract(box).resize({ width: 1000 }), 'plane-mascot.png')
  const m = await sharp(`${OUT}/plane-mascot.png`).metadata()
  meta.planeMascot = { width: m.width, height: m.height }
}

// ---- Kado: sheet tertutup (Giftbox1.png) dan terbuka (Giftbox2.png): 10 kado per sheet (5 kolom x 2 baris).
// Dipakai 9 pertama berurutan baris-demi-baris (kiri->kanan); kado ke-10 (pojok kanan-bawah) sengaja tidak dipakai.
async function giftBoxes(file) {
  const { data, info } = await sharp(`${SRC}/${file}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height
  const lab = new Int32Array(W * H)
  const boxes = []
  for (let s0 = 0; s0 < W * H; s0++) {
    if (lab[s0] || data[s0 * 4 + 3] <= 20) continue
    const id = boxes.length + 1
    let n = 0, x0 = W, y0 = H, x1 = 0, y1 = 0
    const st = [s0]; lab[s0] = id
    while (st.length) {
      const i = st.pop(); n++
      const x = i % W, y = (i / W) | 0
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
        if (j < 0 || j >= W * H) continue
        if (!lab[j] && data[j * 4 + 3] > 20) { lab[j] = id; st.push(j) }
      }
    }
    boxes.push({ n, x0, y0, x1, y1 })
  }
  const big = boxes.filter((b) => b.n > 3000)
  if (big.length !== 10) throw new Error(`${file}: diharapkan 10 kado, ditemukan ${big.length}`)
  const midY = H / 2
  const row = (b) => ((b.y0 + b.y1) / 2 < midY ? 0 : 1)
  big.sort((p, q) => row(p) - row(q) || p.x0 - q.x0)
  return big.slice(0, 9)
}
const closedBoxes = await giftBoxes('Giftbox1.png')
const openBoxes = await giftBoxes('Giftbox2.png')
meta.gifts = []
for (let i = 0; i < 9; i++) {
  for (const [boxes, file, kind] of [[closedBoxes, 'Giftbox1.png', 'closed'], [openBoxes, 'Giftbox2.png', 'open']]) {
    const bx = boxes[i]
    await png(sharp(`${SRC}/${file}`).extract({ left: bx.x0, top: bx.y0, width: bx.x1 - bx.x0 + 1, height: bx.y1 - bx.y0 + 1 }), `gift-${kind}-${i}.png`)
  }
  const c = closedBoxes[i], o = openBoxes[i]
  meta.gifts.push({ closed: [c.x1 - c.x0 + 1, c.y1 - c.y0 + 1], open: [o.x1 - o.x0 + 1, o.y1 - o.y0 + 1] })
}

// ---- Koper (Baggage.png, 4 koper)
{
  const bags = [[204, 14, 707, 494], [825, 14, 1332, 501], [195, 501, 719, 994], [816, 499, 1342, 996]] // kuning, biru, ungu, pink
  meta.bags = []
  for (let i = 0; i < bags.length; i++) {
    const [x0, y0, x1, y1] = bags[i]
    const w = x1 - x0 + 1, h = y1 - y0 + 1
    await png(sharp(`${SRC}/Baggage.png`).extract({ left: x0, top: y0, width: w, height: h }).resize({ width: 360 }), `bag-${i}.png`)
    const m = await sharp(`${OUT}/bag-${i}.png`).metadata()
    meta.bags.push([m.width, m.height])
  }
}

// ---- Karakter di kursi (sheet A). Gasing + gadis tertidur bersambung: potong di kolom paling kosong.
{
  const f = `${SRC}/Airplane Seat Cartoon Character Cutouts.png`
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height
  let cut = 0, best = 1e9
  for (let x = 1040; x <= 1120; x++) {
    let c = 0
    for (let y = 0; y < H; y++) if (data[(y * W + x) * 4 + 3] > 20) c++
    if (c < best) { best = c; cut = x }
  }
  console.log('potong Gasing|gadis di x =', cut, 'piksel =', best)
  // label komponen terhubung (alpha > 20)
  const lab = new Int32Array(W * H)
  const comps = []
  for (let st0 = 0; st0 < W * H; st0++) {
    if (lab[st0] || data[st0 * 4 + 3] <= 20) continue
    const id = comps.length + 1
    let n = 0, sx = 0
    const st = [st0]; lab[st0] = id
    while (st.length) {
      const i = st.pop(); n++; sx += i % W
      const x = i % W
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
        if (j < 0 || j >= W * H) continue
        if (!lab[j] && data[j * 4 + 3] > 20) { lab[j] = id; st.push(j) }
      }
    }
    comps.push({ id, n, cx: sx / n })
  }
  const big = comps.filter((c) => c.n > 3000).sort((p, q) => p.cx - q.cx)
  console.log('komponen besar:', big.map((c) => [c.id, c.n, Math.round(c.cx)]).join(' | '))
  // urut kiri->kanan: man, boy, (gasing+gadis), woman
  const [cMan, cBoy, cMid, cWoman] = big
  const parts = {
    man: (x, id) => id === cMan.id,
    boy: (x, id) => id === cBoy.id,
    // Gasing di kursi memakai "Character GASING.png"; sheet hanya dipakai untuk gadis tertidur (+ tanda zZ)
    girl: (x, id, p) => {
      if (id === cMid.id) {
        if (x < cut) return false
        const r = data[p * 4], g = data[p * 4 + 1], b = data[p * 4 + 2]
        return !(g > r + 25 && g > b + 40) // buang sisa tepi hijau Gasing
      }
      return false
    },
    zz: (x, id) => { // tanda zZ (komponen kecil di atas kepala gadis)
      const c = id > 0 ? comps[id - 1] : null
      return !!c && c.n <= 3000 && c.cx > 1100 && c.cx < 1470
    },
    woman: (x, id) => id === cWoman.id,
  }
  meta.chars = {}
  for (const [name, pick] of Object.entries(parts)) {
    const buf = Buffer.alloc(W * H * 4)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = y * W + x
      if (!pick(x, lab[p], p)) continue
      const i = p * 4
      buf[i] = data[i]; buf[i + 1] = data[i + 1]; buf[i + 2] = data[i + 2]; buf[i + 3] = data[i + 3]
    }
    const tmpPng = await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer()
    const box = await alphaBox(tmpPng, 12)
    await png(sharp(tmpPng).extract(box), `char-${name}.png`)
    meta.chars[name] = { width: box.width, height: box.height }
  }
}

// ---- Karakter sheet kedua (Floating Family Cartoon Stickers.png): 4 komponen terpisah, kiri->kanan
{
  const f = `${SRC}/Floating Family Cartoon Stickers.png`
  if (!fs.existsSync(f)) throw new Error(`Aset tidak ditemukan: ${f}`)
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height
  const lab = new Int32Array(W * H)
  const comps = []
  for (let st0 = 0; st0 < W * H; st0++) {
    if (lab[st0] || data[st0 * 4 + 3] <= 20) continue
    const id = comps.length + 1
    let n = 0, sx = 0
    const st = [st0]; lab[st0] = id
    while (st.length) {
      const i = st.pop(); n++; sx += i % W
      const x = i % W
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
        if (j < 0 || j >= W * H) continue
        if (!lab[j] && data[j * 4 + 3] > 20) { lab[j] = id; st.push(j) }
      }
    }
    comps.push({ id, n, cx: sx / n })
  }
  const big = comps.filter((c) => c.n > 3000).sort((p, q) => p.cx - q.cx)
  const names = ['bMan', 'bBoy', 'bGirl', 'bWoman']
  meta.charsB = {}
  for (let k = 0; k < names.length; k++) {
    const c = big[k]
    const buf = Buffer.alloc(W * H * 4)
    for (let p = 0; p < W * H; p++) {
      const small = lab[p] > 0 && comps[lab[p] - 1].n <= 3000 && comps[lab[p] - 1].n > 150 && Math.abs(comps[lab[p] - 1].cx - c.cx) < 260 // tanda zZ ikut gadis
      if (lab[p] !== c.id && !(names[k] === 'bGirl' && small)) continue
      const i = p * 4
      buf[i] = data[i]; buf[i + 1] = data[i + 1]; buf[i + 2] = data[i + 2]; buf[i + 3] = data[i + 3]
    }
    const tmpPng = await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer()
    const box = await alphaBox(tmpPng, 12)
    await png(sharp(tmpPng).extract(box), `char-${names[k]}.png`)
    meta.charsB[names[k]] = { width: box.width, height: box.height }
  }
}

// ---- Kabin: topeng jendela (lubang transparan yang tertutup) + warna tepi untuk perluasan atas/bawah
{
  const { data, info } = await sharp(`${SRC}/Dalam Pesawat.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height
  const transparent = (i) => data[i * 4 + 3] <= 20
  // transparan yang terhubung ke tepi gambar = di luar siluet kabin; sisanya (lubang tertutup) = jendela
  const outside = new Uint8Array(W * H)
  const st = []
  const push = (x, y) => { const i = y * W + x; if (!outside[i] && transparent(i)) { outside[i] = 1; st.push(i) } }
  for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1) }
  for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y) }
  while (st.length) {
    const i = st.pop(); const x = i % W, y = (i / W) | 0
    if (x > 0) push(x - 1, y); if (x < W - 1) push(x + 1, y); if (y > 0) push(x, y - 1); if (y < H - 1) push(x, y + 1)
  }
  const win = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) if (transparent(i) && !outside[i]) win[i] = 1
  // lebarkan 4 px agar langit sedikit masuk ke bawah bingkai (tanpa celah)
  const R = 4
  const dil = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!win[y * W + x]) continue
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const xx = x + dx, yy = y + dy
      if (xx >= 0 && yy >= 0 && xx < W && yy < H) dil[yy * W + xx] = 1
    }
  }
  const buf = Buffer.alloc(W * H * 4)
  for (let i = 0; i < W * H; i++) if (dil[i]) { buf[i * 4] = buf[i * 4 + 1] = buf[i * 4 + 2] = 255; buf[i * 4 + 3] = 255 }
  await png(sharp(buf, { raw: { width: W, height: H, channels: 4 } }), 'cabin-windows.png')
  const avg = (x0, y0, x1, y1) => {
    let r = 0, g = 0, b = 0, n = 0
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * W + x) * 4; if (data[i + 3] > 240) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n++ } }
    const h = (v) => Math.round(v / n).toString(16).padStart(2, '0')
    return '#' + h(r) + h(g) + h(b)
  }
  meta.cabinColors = {
    ceil: avg(200, 85, 1800, 100), // panel bin bagasi tepat di bawah tepi atas
    wall: avg(350, 292, 450, 330), // dinding di antara jendela
    floor: avg(300, 746, 1700, 758), // karpet tepat di atas tepi bawah
  }
  console.log('warna kabin', meta.cabinColors)
}

fs.writeFileSync('tools/sprite-meta-v2.json', JSON.stringify(meta, null, 2))
console.log(JSON.stringify(meta))
