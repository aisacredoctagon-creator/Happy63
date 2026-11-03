/**
 * Efek Genie (macOS) untuk pop-up: kartu diiris menjadi N irisan sejajar sumbu animasi. Tiap batas irisan bergerak dari
 * posisi aslinya ke titik asal (kado), makin dekat ke titik asal makin cepat dan makin sempit, sehingga tepi kiri/kanan
 * membentuk corong melengkung dan isi kartu ikut terdistorsi seperti "tersedot". Tiap irisan adalah salinan DOM kartu yang
 * dipotong (overflow: hidden) lalu dipetakan ke trapesium di antara dua batas dengan matrix3d (homografi), jadi tepi corong
 * menyambung mulus tanpa anak tangga.
 *
 * Semua koordinat dalam piksel kanvas .stage (belum di-scale), jadi tetap benar di ukuran layar/fullscreen apa pun.
 */

export interface Point {
  x: number
  y: number
}

interface Rect {
  left: number
  top: number
  width: number
  height: number
}

type Quad = [Point, Point, Point, Point]

const SLICES = 40
/** keterlambatan irisan terjauh terhadap yang terdekat dengan titik asal (0 = serempak) */
const LAG = 0.55
/** irisan saling menimpa sedikit (px sumber) agar tidak ada garis tipis di sambungan */
const OVERLAP = 2
const MIN_SIZE = 2
/** di atas nilai q ini kartu sudah terlalu kecil: irisan disembunyikan (segiempat nyaris titik membuat homografi tidak stabil) */
const HIDE_Q = 0.94
/** bobot perspektif sudut terkecil yang masih diizinkan; di bawahnya jatuh ke transformasi affine */
const MIN_W = 0.35
/** ruang ekstra di sekeliling kartu agar amplop (atas) dan tombol tutup (kanan atas) yang menonjol tidak terpotong */
const PAD = { left: 12, top: 64, right: 36, bottom: 12 }

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
/** kemajuan lokal tiap batas: halus di awal dan akhir */
const smooth = (t: number) => t * t * (3 - 2 * t)

/**
 * matrix3d yang memetakan persegi panjang sumber (0,0)-(w,h) ke segiempat q (urutan: kiri-atas, kanan-atas, kanan-bawah,
 * kiri-bawah). Rumus persegi satuan -> segiempat (Heckbert); bila segiempatnya jajar genjang jatuh ke transformasi affine.
 */
function quadMatrix(q: Quad, w: number, h: number): string | null {
  const [p0, p1, p2, p3] = q
  const dx1 = p1.x - p2.x
  const dx2 = p3.x - p2.x
  const dx3 = p0.x - p1.x + p2.x - p3.x
  const dy1 = p1.y - p2.y
  const dy2 = p3.y - p2.y
  const dy3 = p0.y - p1.y + p2.y - p3.y
  let g = 0
  let hh = 0
  const det = dx1 * dy2 - dx2 * dy1
  if ((dx3 !== 0 || dy3 !== 0) && Math.abs(det) > 1e-9) {
    g = (dx3 * dy2 - dx2 * dy3) / det
    hh = (dx1 * dy3 - dx3 * dy1) / det
  }
  // bobot perspektif tiap sudut (1, 1+g, 1+g+h, 1+h): terlalu kecil/negatif = segiempat terlalu lancip, hasilnya meledak (garis putih tinggi)
  if (Math.min(1 + g, 1 + g + hh, 1 + hh) < MIN_W) {
    g = 0
    hh = 0
  }
  const a = p1.x - p0.x + g * p1.x
  const b = p3.x - p0.x + hh * p3.x
  const d = p1.y - p0.y + g * p1.y
  const e = p3.y - p0.y + hh * p3.y
  const m = [a / w, d / w, g / w, b / h, e / h, hh / h, p0.x, p0.y]
  if (m.some((v) => !Number.isFinite(v) || Math.abs(v) > 1e5)) return null
  return `matrix3d(${a / w},${d / w},0,${g / w},${b / h},${e / h},0,${hh / h},0,0,1,0,${p0.x},${p0.y},0,1)`
}

export class Genie {
  private ghost: HTMLElement
  private slices: HTMLElement[] = []
  private rect: Rect
  private axisY: boolean
  private token = 0
  /** 1 = tersimpan di titik asal, 0 = kartu terbuka penuh */
  q = 1

  constructor(
    private card: HTMLElement,
    stage: HTMLElement,
    private getOrigin: () => Point | null,
    private origin: Point,
    startQ = 1,
  ) {
    this.q = startQ
    const sr = stage.getBoundingClientRect()
    const k = sr.width / stage.offsetWidth
    const cr = card.getBoundingClientRect()
    this.rect = {
      left: (cr.left - sr.left) / k - PAD.left,
      top: (cr.top - sr.top) / k - PAD.top,
      width: cr.width / k + PAD.left + PAD.right,
      height: cr.height / k + PAD.top + PAD.bottom,
    }
    const cx = this.rect.left + this.rect.width / 2
    const cy = this.rect.top + this.rect.height / 2
    // sumbu animasi: vertikal bila titik asal lebih "jauh" secara vertikal (relatif ukuran kartu), selain itu horizontal
    this.axisY = Math.abs(origin.y - cy) / this.rect.height >= Math.abs(origin.x - cx) / this.rect.width

    this.ghost = document.createElement('div')
    this.ghost.className = 'genie-ghost'
    this.ghost.setAttribute('aria-hidden', 'true')
    this.build(cr.width / k, cr.height / k)
    stage.appendChild(this.ghost)
    // scrollTop baru bisa diterapkan setelah salinan masuk DOM
    const live = card.querySelector<HTMLElement>('.letter-body')
    if (live) this.ghost.querySelectorAll<HTMLElement>('.letter-body').forEach((el) => (el.scrollTop = live.scrollTop))
    card.style.visibility = 'hidden'
    this.setQ(this.q)
  }

  private build(cardW: number, cardH: number) {
    const { width: W, height: H } = this.rect
    const step = (this.axisY ? H : W) / SLICES
    for (let i = 0; i < SLICES; i++) {
      const slice = document.createElement('div')
      slice.className = 'genie-slice'
      const len = step + OVERLAP
      slice.style.width = `${this.axisY ? W : len}px`
      slice.style.height = `${this.axisY ? len : H}px`
      const clone = this.card.cloneNode(true) as HTMLElement
      for (const attr of ['id', 'role', 'aria-modal', 'aria-labelledby', 'tabindex']) clone.removeAttribute(attr)
      clone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'))
      clone.classList.add('is-clone')
      clone.style.visibility = 'visible'
      clone.style.position = 'absolute'
      clone.style.margin = '0'
      clone.style.width = `${cardW}px`
      clone.style.height = `${cardH}px`
      clone.style.maxHeight = 'none'
      clone.style.left = `${PAD.left - (this.axisY ? 0 : i * step)}px`
      clone.style.top = `${PAD.top - (this.axisY ? i * step : 0)}px`
      slice.appendChild(clone)
      this.ghost.appendChild(slice)
      this.slices.push(slice)
    }
  }

  /** q: 0 = kartu penuh, 1 = menyempit penuh di titik asal */
  setQ(q: number) {
    this.q = q
    const { left, top, width: W, height: H } = this.rect
    const o = this.origin
    const axisLen = this.axisY ? H : W
    const a0 = this.axisY ? top : left
    const aO = this.axisY ? o.y : o.x
    const cAcrossO = this.axisY ? o.x : o.y
    const cAcross0 = this.axisY ? left + W / 2 : top + H / 2
    const across = this.axisY ? W : H
    // jarak terjauh batas irisan dari titik asal, untuk menormalkan keterlambatan
    const maxDist = Math.max(Math.abs(a0 - aO), Math.abs(a0 + axisLen - aO), 1)

    // tiap batas irisan: posisi sepanjang sumbu, titik tengah dan lebar melintang sumbu
    const pos: number[] = []
    const mid: number[] = []
    const size: number[] = []
    for (let k = 0; k <= SLICES; k++) {
      const a = a0 + (axisLen * k) / SLICES
      const d = Math.abs(a - aO) / maxDist
      const m = smooth(clamp01(q * (1 + LAG) - LAG * d))
      pos.push(lerp(a, aO, m))
      mid.push(lerp(cAcross0, cAcrossO, m))
      size.push(Math.max(MIN_SIZE, across * Math.pow(1 - m, 1.1)))
    }

    const step = axisLen / SLICES
    const ext = 1 + OVERLAP / step
    for (let i = 0; i < SLICES; i++) {
      const pt = (k: number, side: -1 | 1): Point =>
        this.axisY ? { x: mid[k] + (side * size[k]) / 2, y: pos[k] } : { x: pos[k], y: mid[k] + (side * size[k]) / 2 }
      // A = sisi awal irisan (kiri bila sumbu vertikal, atas bila horizontal), B = sisi satunya; indeks 0/1 = batas awal/akhir irisan
      const [a0, b0, a1, b1] = [pt(i, -1), pt(i, 1), pt(i + 1, -1), pt(i + 1, 1)]
      // batas akhir diperpanjang sedikit (OVERLAP) searah irisan supaya menimpa irisan berikutnya
      const grow = (from: Point, to: Point): Point => ({ x: from.x + (to.x - from.x) * ext, y: from.y + (to.y - from.y) * ext })
      // urutan sudut sumber: kiri-atas, kanan-atas, kanan-bawah, kiri-bawah
      const quad: Quad = this.axisY ? [a0, b0, grow(b0, b1), grow(a0, a1)] : [a0, grow(a0, a1), grow(b0, b1), b0]
      const tf = this.axisY ? quadMatrix(quad, W, step + OVERLAP) : quadMatrix(quad, step + OVERLAP, H)
      const el = this.slices[i]
      if (tf) {
        el.style.transform = tf
        el.style.visibility = ''
      } else {
        el.style.visibility = 'hidden'
      }
    }
    // memudar sebelum menjadi titik; di atas HIDE_Q seluruh irisan disembunyikan
    this.ghost.style.opacity = q > 0.8 ? String(clamp01((HIDE_Q - q) / (HIDE_Q - 0.8))) : '1'
    this.ghost.style.visibility = q >= HIDE_Q ? 'hidden' : ''
  }

  /** animasikan q ke target (0 = buka, 1 = tutup); animasi sebelumnya dibatalkan. Hasil: true bila selesai, false bila digantikan/dibatalkan */
  animateTo(target: 0 | 1, ms: number): Promise<boolean> {
    const id = ++this.token
    const from = this.q
    const t0 = performance.now()
    const span = Math.abs(target - from)
    return new Promise((resolve) => {
      if (span === 0) return resolve(true)
      const ease = target === 0 ? easeOut : easeInOut
      const tick = (now: number) => {
        if (id !== this.token) return resolve(false)
        // titik asal bisa berubah (resize/fullscreen saat pop-up terbuka): ikuti posisi kado terkini
        const live = this.getOrigin()
        if (live) this.origin = live
        const t = clamp01((now - t0) / (ms * span))
        this.setQ(lerp(from, target, ease(t)))
        if (t < 1) requestAnimationFrame(tick)
        else resolve(true)
      }
      requestAnimationFrame(tick)
    })
  }

  /** lepas irisan; restoreCard=false dipakai saat menutup supaya kartu asli tidak sempat berkedip sebelum dilepas dari DOM */
  destroy(restoreCard = true) {
    this.token++
    this.ghost.remove()
    if (restoreCard) this.card.style.visibility = ''
  }
}
