interface Props {
  src: string
  /** ukuran gambar utama (px) yang digambar scene di (0,0) */
  w: number
  h: number
}

/** seberapa jauh latar diperluas melewati tepi gambar (px kanvas); cukup untuk jendela sangat lebar/tinggi */
const EXT = 1000

/**
 * Perluasan latar ke segala arah dengan MEMBENTANGKAN piksel tepi gambar (kolom/baris paling pinggir ditarik keluar).
 * Sambungan dengan gambar utama persis menyatu (tidak ada garis), sehingga pada jendela dengan rasio apa pun
 * (lebih lebar atau lebih tinggi dari 16:9) latar tetap menerus sampai ke tepi layar, tanpa pita hitam.
 * Taruh sebagai saudara gambar utama di elemen yang sama, jadi ikut bergerak/zoom bersama gambar utama.
 */
export function EdgeExtend({ src, w, h }: Props) {
  const bg = (pos: string) => ({
    backgroundImage: `url(${src})`,
    backgroundSize: `${w}px ${h}px`,
    backgroundPosition: pos,
    backgroundRepeat: 'no-repeat',
  })
  const N = 3 // lebar/tinggi irisan tepi (px); sedikit lebih dari 1 agar tidak ada sampling di luar gambar
  const k = EXT / N
  const L = { ...bg('0 0'), left: -N, top: 0, width: N, height: h, transformOrigin: '100% 0', transform: `scaleX(${k})` }
  const R = { ...bg(`-${w - N}px 0`), left: w, top: 0, width: N, height: h, transformOrigin: '0 0', transform: `scaleX(${k})` }
  const T = { ...bg('0 0'), left: 0, top: -N, width: w, height: N, transformOrigin: '0 100%', transform: `scaleY(${k})` }
  const B = { ...bg(`0 -${h - N}px`), left: 0, top: h, width: w, height: N, transformOrigin: '0 0', transform: `scaleY(${k})` }
  const TL = { ...bg('0 0'), left: -N, top: -N, width: N, height: N, transformOrigin: '100% 100%', transform: `scale(${k})` }
  const TR = { ...bg(`-${w - N}px 0`), left: w, top: -N, width: N, height: N, transformOrigin: '0 100%', transform: `scale(${k})` }
  const BL = { ...bg(`0 -${h - N}px`), left: -N, top: h, width: N, height: N, transformOrigin: '100% 0', transform: `scale(${k})` }
  const BR = { ...bg(`-${w - N}px -${h - N}px`), left: w, top: h, width: N, height: N, transformOrigin: '0 0', transform: `scale(${k})` }
  return (
    <>
      {[L, R, T, B, TL, TR, BL, BR].map((style, i) => (
        <div key={i} className="mirror-tile" style={style} aria-hidden />
      ))}
    </>
  )
}
