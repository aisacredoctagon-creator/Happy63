/**
 * Daftar lagu BGM (musik latar), SATU tempat konfigurasi. Menambah lagu:
 *   1. taruh sumbernya di 'aset proyek/' dan tambahkan item di scripts/audio-sources.json (category "music", "register": false),
 *   2. jalankan `npm run audio` (normalisasi + konversi ke public/assets/audio/),
 *   3. tambahkan satu entri di BGM_TRACKS di bawah.
 * Lagu dimuat lazy: hanya lagu yang dipilih yang diunduh dan di-decode.
 */
export interface BgmTrack {
  id: string
  /** judul yang tampil di panel pilihan */
  title: string
  /** nama file di public/assets/audio/ */
  file: string
  /**
   * lama crossfade penyambung loop (detik). 0 = file memang dirancang sebagai loop, diputar apa adanya.
   * Lagu utuh (bukan loop) diberi crossfade agar sambungan akhir ke awal mulus.
   */
  crossfade: number
}

export const BGM_TRACKS: BgmTrack[] = [
  { id: 'orang-jenius', title: 'Orang Jenius Suka Berhitung', file: 'bgm-orang-jenius.m4a', crossfade: 2 },
  { id: 'coba-soal-gasing', title: 'Coba Soal Gasing', file: 'bgm-coba-soal-gasing.m4a', crossfade: 1.5 },
  { id: 'gasing-medley', title: 'Gasing Medley', file: 'bgm-gasing-medley.m4a', crossfade: 2 },
]

/** lagu bawaan sebelum pengguna memilih */
export const BGM_DEFAULT = 'coba-soal-gasing'

/** lama crossfade saat berganti lagu (detik) */
export const BGM_FADE = 0.8

/**
 * kunci localStorage untuk pilihan lagu. Versi kunci dinaikkan (v2) saat bawaan diganti ke "Coba Soal Gasing" supaya pilihan
 * lama semua pemain diabaikan dan mereka mulai dari bawaan baru; pilihan berikutnya tersimpan lagi di kunci ini.
 */
export const BGM_STORAGE_KEY = 'gasing-bgm-v2'
