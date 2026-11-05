import spriteMeta from '../tools/sprite-meta.json'
import spriteMetaV2 from '../tools/sprite-meta-v2.json'

/** Ukuran kanvas dasar. Semua scene digambar di 1920x1080 lalu di-scale agar muat di viewport. */
export const STAGE_W = 1920
export const STAGE_H = 1080

export const asset = (path: string) => `${import.meta.env.BASE_URL}assets/${path}`

/** Video ucapan (hasil kompres tools/process-video.mjs dari 'aset proyek/Ucapan Ultah Prof 63.mp4'). Dimuat lazy oleh TvPlayer. */
export const VIDEO_SRC = asset('video/ucapan-ultah.mp4')

export const IMG = {
  cabinShell: asset('images/cabin-shell.webp'),
  cabinWindows: asset('images/cabin-windows.webp'),
  langit1: asset('images/langit1.webp'),
  awan1: asset('images/awan1.webp'),
  awan2: asset('images/awan2.webp'),
  transisi: asset('images/transisi.webp'), // satu gambar awan lebar untuk transisi antar scene (dari Transisi.webp)
  // Scene 03/05/06/07 memakai aset visual baru (lihat SCENES.md, "Catatan aset"); scene3-bg.webp (Scene 04) masih bernama naskah lama
  langitBg: asset('images/langit-awan.webp'), // Scene 03
  pesawatLangit: asset('images/pesawat-samping.webp'), // Scene 03
  petaBg: asset('images/scene3-bg.webp'), // Scene 04
  planeMascot: asset('images/plane-mascot.webp'), // Scene 04
  partyHat: asset('images/topi-pesta.webp'), // topi pesta Gasing (menutupi tanduk hijau, lihat PartyHat.tsx)
  btnMendarat: asset('images/btn-mendarat.webp'), // ikon Mendarat di peta (Scene 04, dari teman)
  bandara: asset('images/bandara-bagasi.webp'), // Scene 05
  ruangTvBg: asset('images/bandara-lobi.webp'), // Scene 06
  gasing: asset('images/gasing.webp'),
  gasingSleepy: asset('images/gasing-sleepy.webp'), // mata terpejam (kedipan, semua scene)
  gasingAlert: asset('images/gasing-alert.webp'), // kaget (Scene 06b)
  gasingMirrored: asset('images/gasing-mirrored.webp'), // membelakangi kamera, menghadap TV (Scene 06)
  tv: asset('images/tv-monitor.webp'), // Scene 07-08
  charMan: asset('images/char-man.webp'),
  charBoy: asset('images/char-boy.webp'),
  charGirl: asset('images/char-girl.webp'),
  charWoman: asset('images/char-woman.webp'),
  charZz: asset('images/char-zz.webp'),
  charBMan: asset('images/char-bMan.webp'),
  charBBoy: asset('images/char-bBoy.webp'),
  charBWoman: asset('images/char-bWoman.webp'),
  charBGirl: asset('images/char-bGirl.webp'),
}
export const CLOUDS = [IMG.awan1, IMG.awan2]

/** Kado: indeks 0-8 mengikuti urutan baris pada Giftbox1.png / Giftbox2.png (kiri ke kanan, atas ke bawah). */
export const giftImg = (index: number, kind: 'closed' | 'open') => asset(`images/gift-${kind}-${index}.webp`)
export const GIFT_SIZE = spriteMetaV2.gifts
/** Koper dari Baggage.png: 0 kuning, 1 biru, 2 ungu, 3 pink. */
export const bagImg = (index: number) => asset(`images/bag-${index}.webp`)
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

/** Latar lobi TV (Scene 06) berukuran 1752x897; "dunia" digambar setinggi 1080 px. */
export const LOBBY = {
  srcW: 1752,
  srcH: 897,
  f: STAGE_H / 897,
  worldW: Math.round((1752 * STAGE_H) / 897),
}

/** proporsi pesawat-samping.webp (1600x535) */
export const PLANE_SIDE_ASPECT = 1600 / 535

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
