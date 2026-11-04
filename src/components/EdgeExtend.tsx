import { useStageView } from './Stage'

interface Props {
  src: string
  /** ukuran gambar utama (px) yang digambar scene di (0,0) */
  w: number
  h: number
}


/**
 * Perluasan latar ke segala arah dengan MEMBENTANGKAN piksel tepi gambar (kolom/baris paling pinggir ditarik keluar).
 * Sambungan dengan gambar utama persis menyatu (tidak ada garis), sehingga pada jendela dengan rasio apa pun
 * (lebih lebar atau lebih tinggi dari 16:9) latar tetap menerus sampai ke tepi layar, tanpa pita hitam.
 * Taruh sebagai saudara gambar utama di elemen yang sama, jadi ikut bergerak/zoom bersama gambar utama.
 */
export function EdgeExtend({ src, w, h }: Props) {
  // perluasan hanya sebesar celah nyata layar (lihat StageViewInfo.padX/padY): lapisan lebih kecil = memori GPU hemat
  const { padX, padY } = useStageView()
  const bg = (pos: string) => ({
    backgroundImage: `url(${src})`,
    backgroundSize: `${w}px ${h}px`,
    backgroundPosition: pos,
    backgroundRepeat: 'no-repeat',
  })
  const N = 3 // lebar/tinggi irisan tepi (px); sedikit lebih dari 1 agar tidak ada sampling di luar gambar
  const kx = padX / N
  const ky = padY / N
  const L = { ...bg('0 0'), left: -N, top: 0, width: N, height: h, transformOrigin: '100% 0', transform: `scaleX(${kx})` }
  const R = { ...bg(`-${w - N}px 0`), left: w, top: 0, width: N, height: h, transformOrigin: '0 0', transform: `scaleX(${kx})` }
  const T = { ...bg('0 0'), left: 0, top: -N, width: w, height: N, transformOrigin: '0 100%', transform: `scaleY(${ky})` }
  const B = { ...bg(`0 -${h - N}px`), left: 0, top: h, width: w, height: N, transformOrigin: '0 0', transform: `scaleY(${ky})` }
  const TL = { ...bg('0 0'), left: -N, top: -N, width: N, height: N, transformOrigin: '100% 100%', transform: `scale(${kx}, ${ky})` }
  const TR = { ...bg(`-${w - N}px 0`), left: w, top: -N, width: N, height: N, transformOrigin: '0 100%', transform: `scale(${kx}, ${ky})` }
  const BL = { ...bg(`0 -${h - N}px`), left: -N, top: h, width: N, height: N, transformOrigin: '100% 0', transform: `scale(${kx}, ${ky})` }
  const BR = { ...bg(`-${w - N}px -${h - N}px`), left: w, top: h, width: N, height: N, transformOrigin: '0 0', transform: `scale(${kx}, ${ky})` }
  return (
    <>
      {[L, R, T, B, TL, TR, BL, BR].map((style, i) => (
        <div key={i} className="mirror-tile" style={style} aria-hidden />
      ))}
    </>
  )
}
