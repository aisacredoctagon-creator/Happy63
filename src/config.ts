import spriteMeta from '../tools/sprite-meta.json'
import spriteMetaV2 from '../tools/sprite-meta-v2.json'

/** Ukuran kanvas dasar. Semua scene digambar di 1920x1080 lalu di-scale agar muat di viewport. */
export const STAGE_W = 1920
export const STAGE_H = 1080

export const asset = (path: string) => `${import.meta.env.BASE_URL}assets/${path}`

/** Ganti file ini dengan video asli (cukup timpa filenya, tidak perlu ubah kode). */
export const VIDEO_SRC = asset('video/ucapan.mp4')

export const IMG = {
  cabinShell: asset('images/cabin-shell.webp'),
  cabinWindows: asset('images/cabin-windows.png'),
  langit1: asset('images/langit1.webp'),
  awan1: asset('images/awan1.webp'),
  awan2: asset('images/awan2.webp'),
  transisi: asset('images/transisi.webp'), // satu gambar awan lebar untuk transisi antar scene (dari Transisi.webp)
  // nama file gambar di bawah mengikuti naskah desain lama (scene2-bg dst.), bukan nomor scene baru (lihat SCENES.md)
  langitBg: asset('images/scene2-bg.webp'), // Scene 03
  pesawatLangit: asset('images/scene2-plane.png'), // Scene 03
  petaBg: asset('images/scene3-bg.webp'), // Scene 04
  planeMascot: asset('images/plane-mascot.png'), // Scene 04
  partyHat: asset('images/party-hat.svg'), // topi pesta Gasing (dari teman)
  btnMendarat: asset('images/btn-mendarat.png'), // ikon Mendarat di peta (Scene 04, dari teman)
  bandara: asset('images/bandara.webp'), // Scene 05
  ruangTvBg: asset('images/scene5-bg.webp'), // Scene 06
  gasing: asset('images/gasing.png'),
  tv: asset('images/scene6-tv.webp'), // Scene 07-08
  charMan: asset('images/char-man.png'),
  charBoy: asset('images/char-boy.png'),
  charGirl: asset('images/char-girl.png'),
  charWoman: asset('images/char-woman.png'),
  charZz: asset('images/char-zz.png'),
  charBMan: asset('images/char-bMan.png'),
  charBBoy: asset('images/char-bBoy.png'),
  charBWoman: asset('images/char-bWoman.png'),
  charBGirl: asset('images/char-bGirl.png'),
}
export const CLOUDS = [IMG.awan1, IMG.awan2]

/** Kado: indeks 0-8 mengikuti urutan baris pada Giftbox1.png / Giftbox2.png (kiri ke kanan, atas ke bawah). */
export const giftImg = (index: number, kind: 'closed' | 'open') => asset(`images/gift-${kind}-${index}.png`)
export const GIFT_SIZE = spriteMetaV2.gifts
/** Koper dari Baggage.png: 0 kuning, 1 biru, 2 ungu, 3 pink. */
export const bagImg = (index: number) => asset(`images/bag-${index}.png`)
export const BAG_SIZE = spriteMetaV2.bags

export const PRELOAD_IMAGES = [
  ...Object.values(IMG),
  ...GIFT_SIZE.flatMap((_, i) => [giftImg(i, 'closed'), giftImg(i, 'open')]),
  ...BAG_SIZE.map((_, i) => bagImg(i)),
]

/** Gambar scene 4 & 5 berbentuk panorama 1983x793; "dunia" digambar setinggi 1080 px. */
export const WIDE = {
  srcW: 1983,
  srcH: 793,
  f: STAGE_H / 793,
  worldW: Math.round((1983 * STAGE_H) / 793),
}

/** Gambar scene 2 & 3 berukuran 1672x941 (16:9), di-stretch ke 1920x1080. */
export const SKY = { srcW: 1672, srcH: 941 }

/** Kabin (Group 57.png) berukuran 1983x793. */
export const CABIN = { w: 1983, h: 793 }
/** warna tepi kabin (diambil dari aset) untuk memperluas interior ke atas dan bawah */
export const CABIN_COLORS = spriteMetaV2.cabinColors

/** Posisi/ukuran sprite hasil potongan otomatis (tools/process-assets.mjs), dalam piksel gambar asli. */
export const SPRITE = spriteMeta
export const GASING_ASPECT = spriteMetaV2.gasing.width / spriteMetaV2.gasing.height
export const PLANE_MASCOT = spriteMetaV2.planeMascot
