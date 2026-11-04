/**
 * Efek Genie (macOS) untuk pop-up: kartu diiris menjadi N irisan sejajar sumbu animasi. Tiap batas irisan bergerak dari
 * posisi aslinya ke titik asal (kado), makin dekat ke titik asal makin cepat dan makin sempit, sehingga tepi kiri/kanan
 * membentuk corong melengkung dan isi kartu ikut terdistorsi seperti "tersedot". Tiap irisan adalah salinan DOM kartu yang
 * dipotong (overflow: hidden) lalu dipetakan ke jajar genjang di antara dua batas dengan transformasi affine 2D, dan
 * dipangkas (clip-path) menjadi trapesium persisnya, jadi tepi corong tetap menyambung mulus tanpa anak tangga.
 *
 * Sengaja TIDAK memakai matrix3d/perspektif: 40 layer dengan proyeksi perspektif ekstrem membuat sebagian GPU/Chrome gagal
 * merasterisasi isinya (muncul garis putih tinggi di sisi corong). Transformasi affine + clip-path aman di semua GPU.
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

const SLICES = 72
/** keterlambatan irisan terjauh terhadap yang terdekat dengan titik asal (0 = serempak) */
const LAG = 0.55
/** irisan saling menimpa sedikit (px sumber) agar tidak ada garis tipis di sambungan */
const OVERLAP = 2
const MIN_SIZE = 2
/** di atas nilai q ini kartu sudah terlalu kecil: irisan disembunyikan */
const HIDE_Q = 0.94
/** ruang ekstra di sekeliling kartu agar amplop (atas) dan tombol tutup (kanan atas) yang menonjol tidak terpotong */
const PAD = { left: 12, top: 64, right: 36, bottom: 12 }

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
/** kemajuan lokal tiap batas: halus di awal dan akhir */
const smooth = (t: number) => t * t * (3 - 2 * t)

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
    const len = step + OVERLAP
    const ext = 1 + OVERLAP / step
    const f3 = (v: number) => v.toFixed(3)
    for (let i = 0; i < SLICES; i++) {
      // titik tengah awal/akhir irisan; batas akhir diperpanjang sedikit (OVERLAP) searah irisan supaya menimpa irisan berikutnya
      const c0: Point = this.axisY ? { x: mid[i], y: pos[i] } : { x: pos[i], y: mid[i] }
      const cn: Point = this.axisY ? { x: mid[i + 1], y: pos[i + 1] } : { x: pos[i + 1], y: mid[i + 1] }
      const c1: Point = { x: c0.x + (cn.x - c0.x) * ext, y: c0.y + (cn.y - c0.y) * ext }
      const s0 = size[i]
      const s1 = lerp(size[i], size[i + 1], ext)
      // jajar genjang memakai lebar terbesar dari kedua batas; sisi yang lebih sempit dipangkas clip-path menjadi trapesium persis
      const s = Math.max(s0, s1)
      const ux = (c1.x - c0.x) / len
      const uy = (c1.y - c0.y) / len
      const el = this.slices[i]
      if (this.axisY) {
        // lokal x = melintang sumbu (lebar W), lokal y = sepanjang sumbu
        el.style.transform = `matrix(${s / W},0,${ux},${uy},${c0.x - s / 2},${c0.y})`
        const r0 = (W / 2) * (s0 / s)
        const r1 = (W / 2) * (s1 / s)
        el.style.clipPath = `polygon(${f3(W / 2 - r0)}px 0,${f3(W / 2 + r0)}px 0,${f3(W / 2 + r1)}px ${len}px,${f3(W / 2 - r1)}px ${len}px)`
      } else {
        // lokal x = sepanjang sumbu, lokal y = melintang sumbu (tinggi H)
        el.style.transform = `matrix(${ux},${uy},0,${s / H},${c0.x},${c0.y - s / 2})`
        const r0 = (H / 2) * (s0 / s)
        const r1 = (H / 2) * (s1 / s)
        el.style.clipPath = `polygon(0 ${f3(H / 2 - r0)}px,${len}px ${f3(H / 2 - r1)}px,${len}px ${f3(H / 2 + r1)}px,0 ${f3(H / 2 + r0)}px)`
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
