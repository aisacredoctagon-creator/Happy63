/**
 * Efek Genie (macOS) untuk pop-up, versi 1 elemen: kartu aslinya sendiri (tanpa salinan, tanpa irisan) disedot ke titik asal
 * (kado) dengan satu transform: translate (menuju titik asal) + perspective/rotate (sisi yang dekat titik asal menyempit,
 * jadi bentuknya mengerucut seperti corong) + scale (menciut) + opacity (memudar di ujung). Hanya transform dan opacity
 * yang dianimasikan lewat Web Animations API, jadi seluruhnya jalan di compositor/GPU dan tidak menyentuh DOM per frame.
 *
 * Koordinat dalam piksel kanvas .stage (belum di-scale), jadi tetap benar di ukuran layar/fullscreen apa pun.
 */

export interface Point {
  x: number
  y: number
}

/** kemiringan (derajat) yang membuat sisi dekat titik asal menyempit; sedang saja agar tidak ekstrem di GPU mana pun */
const TILT = 52
/** jarak pandang perspektif (px kanvas) */
const PERSPECTIVE = 1100

const CLOSE_EASING = 'cubic-bezier(0.55, 0.05, 0.75, 0.45)'
const OPEN_EASING = 'cubic-bezier(0.2, 0.75, 0.25, 1)'

/** keyframe menutup (kartu penuh -> titik asal); untuk membuka dipakai urutan terbalik */
function closeFrames(card: HTMLElement, host: HTMLElement, origin: Point): Keyframe[] {
  const sr = host.getBoundingClientRect()
  const k = sr.width / host.offsetWidth || 1
  const cr = card.getBoundingClientRect()
  const w = cr.width / k
  const h = cr.height / k
  const dx = origin.x - ((cr.left - sr.left) / k + w / 2)
  const dy = origin.y - ((cr.top - sr.top) / k + h / 2)
  // sumbu animasi: vertikal bila titik asal lebih "jauh" secara vertikal (relatif ukuran kartu), selain itu horizontal
  const axisY = Math.abs(dy) / h >= Math.abs(dx) / w
  const tilt = axisY ? (dy > 0 ? -TILT : TILT) : dx > 0 ? TILT : -TILT
  const rot = axisY ? 'rotateX' : 'rotateY'
  const pose = (f: number, tiltF: number, sAcross: number, sAlong: number, opacity: number): Keyframe => ({
    transform:
      `translate(${(dx * f).toFixed(2)}px, ${(dy * f).toFixed(2)}px) perspective(${PERSPECTIVE}px) ` +
      `${rot}(${(tilt * tiltF).toFixed(2)}deg) scale(${axisY ? sAcross : sAlong}, ${axisY ? sAlong : sAcross})`,
    opacity,
  })
  return [
    { ...pose(0, 0, 1, 1, 1), offset: 0 },
    { ...pose(0.2, 0.7, 0.6, 0.88, 1), offset: 0.4 },
    { ...pose(0.82, 1, 0.16, 0.3, 0.9), offset: 0.85 },
    { ...pose(1, 1, 0.04, 0.05, 0), offset: 1 },
  ]
}

/**
 * Jalankan animasi Genie pada kartu. 'open' = dari titik asal membuka ke kartu penuh, 'close' = menciut ke titik asal.
 * Pemanggil memutuskan kapan animasi dilepas (cancel); untuk 'close' keadaan akhir (tak terlihat) dipertahankan sampai
 * kartu dilepas dari DOM, jadi tidak ada kedipan.
 */
export function genieAnimate(card: HTMLElement, host: HTMLElement, origin: Point, dir: 'open' | 'close', ms: number): Animation {
  const frames = closeFrames(card, host, origin)
  if (dir === 'open') {
    const rev = frames.map((f) => ({ ...f, offset: 1 - (f.offset as number) })).reverse()
    return card.animate(rev, { duration: ms, easing: OPEN_EASING, fill: 'both' })
  }
  return card.animate(frames, { duration: ms, easing: CLOSE_EASING, fill: 'forwards' })
}
