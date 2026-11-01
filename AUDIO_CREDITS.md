# Audio

Semua audio ada di `public/assets/audio/`. Kode memuatnya lewat `src/audio/audio.ts` (satu pengelola audio untuk semua scene).
**File yang belum ada dilewati diam-diam** (tanpa error), jadi website tetap jalan; cukup taruh file dengan nama persis di bawah ini.

| File | Dipakai di | Status | Sumber / lisensi |
| --- | --- | --- | --- |
| `music-gasing-loop.mp3` | Scene Kado di Peta saja (loop; fade out saat Mendarat) | ADA | Dari Anda: `2b. Coba Soal Gasing Loop.mp3` |
| `sfx-click.mp3` | Semua tombol (dipotong otomatis max 280 ms) | BELUM ADA | - |
| `sfx-gift.mp3` | Tombol kado di peta (ceria/ajaib, chime/sparkle) | BELUM ADA | - |
| `amb-cabin.mp3` | Scene Kabin (dengung ambient pesawat, loop) | BELUM ADA | - |
| `amb-wind.mp3` | Scene Luar Pesawat (angin, loop) | BELUM ADA | - |
| `amb-airport.mp3` | Scene Mendarat + Scene TV (suasana bandara, loop) | BELUM ADA | - |

## Spesifikasi yang disarankan

- Format `.mp3` (nama file harus persis seperti tabel). Mono/stereo bebas.
- SFX klik: pendek (< 300 ms). SFX kado: sekitar 0,5-1,5 detik.
- Ambient: 10-60 detik. Sambungan loop dibuat mulus otomatis oleh kode (crossfade 1,5-2 detik), jadi tidak perlu loop sempurna dari sumbernya.
- Volume sudah diseimbangkan di `src/audio/audio.ts` (`SFX_VOL`, `LOOP_VOL`); ubah di sana bila perlu.

## Catat sumber di sini setelah file ditambahkan

Contoh: `sfx-click.mp3` - Nama suara - situs - lisensi (CC0 / Mixkit License / dibuat sendiri).
