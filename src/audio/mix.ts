/**
 * Hierarki volume audio: SATU tempat untuk mengatur keseimbangan. Angka dalam dB; 0 = level hasil normalisasi/kalibrasi
 * (ambience -22 LUFS, SFX -16 LUFS, lihat levels.json). Tiap SFX punya `tier` di registrasinya (synth.ts), jadi SFX baru
 * otomatis mengikuti gain tingkatnya.
 *
 *   ambience  loop latar (kabin, bandara, angin, roda)        paling pelan, hanya latar
 *   minor     transisi, whoosh, klik/hover, pop, muncul/hilang  pelan: ~10 dB di bawah SFX utama
 *   main      aksi utama di scene (surat, denting, Gasing, TV)  sedang
 *   key       momen kunci/reward (mulai, mendarat, penutup)     paling menonjol
 *   music     musik BGM (ketiga lagu sudah dinormalisasi ke -20 LUFS, jadi 0 dB)
 */
export const VOLUME = {
  ambience: 0,
  minor: -10,
  main: 0,
  key: 3,
  music: 0,
} as const

export type Tier = 'minor' | 'main' | 'key'

/** batas jumlah SFX per tingkat yang boleh berbunyi bersamaan (yang lebih banyak dibuang), supaya yang kecil tidak menumpuk */
export const MAX_CONCURRENT: Partial<Record<Tier, number>> = { minor: 4 }

/** variasi acak maksimum untuk SFX yang sering berulang: +/-5% pitch dan +/-5% volume (di dalam batas tingkatnya) */
export const MAX_VARY = 0.05
