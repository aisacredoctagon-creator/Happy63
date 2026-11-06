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
   * Lagu utuh (bukan loop) diberi crossfade agar sambungan akhir ke awal mulus. Diabaikan bila `tailLoop` diisi.
   */
  crossfade: number
  /**
   * File "...Loop.mp3" hasil ekspor DAW: [1 ketukan senyap] + [N birama musik] + [2 birama ekor reverb] (penjelasan di
   * bgmPlayer.ts dan docs/BGM-LOOP.md). Loop mulus dibuat dengan OVERLAP: salinan berikutnya dimulai tiap `period` detik
   * (= N birama), sedangkan salinan sebelumnya dibiarkan memainkan ekor reverb-nya sampai habis di bawah awal salinan baru.
   * Tanpa fade, tanpa jeda.
   */
  tailLoop?: {
    /** jarak antar awal salinan (detik) = N birama = N x 4 x 60 / BPM */
    period: number
    /** posisi awal pemutaran pertama (detik), melompati ketukan senyap di awal file supaya musik langsung terdengar */
    startAt: number
  }
}

export const BGM_TRACKS: BgmTrack[] = [
  // 3b. Orang Jenius Suka Berhitung Loop.mp3: 100 BPM, 42 birama musik (+1 ketukan senyap di awal, +2 birama ekor) = 106,2 s
  { id: 'orang-jenius', title: 'Orang Jenius Suka Berhitung', file: 'bgm-orang-jenius-loop.m4a', crossfade: 0, tailLoop: { period: 100.8, startAt: 0.45 } },
  // 2b. Coba Soal Gasing Loop.mp3: 110 BPM, 36 birama musik (+1 ketukan senyap di awal, +2 birama ekor) = 83,47 s
  { id: 'coba-soal-gasing', title: 'Coba Soal Gasing', file: 'bgm-coba-soal-gasing-loop.m4a', crossfade: 0, tailLoop: { period: (36 * 4 * 60) / 110, startAt: 0.45 } },
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
