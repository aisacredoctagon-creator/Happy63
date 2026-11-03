# Audio

Semua audio dikelola satu modul: `src/audio/audio.ts` (manager, volume, mute, polifoni) dan `src/audio/synth.ts` (resep suara).

**Semua SFX dan ambient sudah punya versi prosedural bawaan** (dibuat dari osilator/noise lewat Web Audio API): tanpa file, tanpa lisensi, tanpa biaya loading. Website langsung berbunyi tanpa menambah file apa pun.
Satu-satunya file asli saat ini adalah musik `music-gasing-loop.mp3` (dari "2b. Coba Soal Gasing Loop.mp3").

## Menimpa suara bawaan dengan file asli (opsional)

1. Taruh file `.mp3` di `public/assets/audio/` dengan nama persis (lihat tabel).
2. Tambahkan namanya (tanpa awalan/ekstensi, mis. `click`, `cabin`) ke `public/assets/audio/manifest.json`:

   ```json
   { "overrides": ["music", "click", "cabin"] }
   ```

File yang tidak ada di manifest tidak pernah diminta, jadi tidak ada error 404 di konsol. File yang rusak otomatis jatuh kembali ke versi prosedural.

## Ambient dan musik (loop)

| Nama manifest | File | Dipakai di | Bawaan |
| --- | --- | --- | --- |
| `music` | `music-gasing-loop.mp3` | Scene 04 - Peta Kado (fade out saat Mendarat) | **File ada** |
| `cabin` | `amb-cabin.mp3` | Scene 02 - Kabin Pesawat | prosedural (dengung mesin) |
| `wind` | `amb-wind.mp3` | Scene 03 - Pesawat di Langit | prosedural (angin) |
| `airport` | `amb-airport.mp3` | Scene 05 - Bandara Bagasi dan Scene 06-08 (TV) | prosedural (dengung percakapan jauh); **paling disarankan diganti file asli** |
| `belt` | `amb-belt.mp3` | Scene 05 (ban berjalan) | prosedural |
| `wheels` | `amb-wheels.mp3` | Scene 05 (05c, koper ditarik berjalan) | prosedural |

Spesifikasi: `.mp3`, 10-60 detik. Sambungan loop dibuat mulus otomatis (crossfade 1-2 detik) sehingga tidak perlu loop sempurna.

## Daftar SFX

File override: `sfx-<nama>.mp3`. Kolom "Dipicu" menunjuk tempat pemicunya di kode.

| Nama | Kategori | Dipicu |
| --- | --- | --- |
| `click` | klik | semua tombol (`App.tsx`, bawaan `data-sfx`) |
| `hover` | klik | hover tombol (mouse saja, dibatasi frekuensinya) |
| `tick` | klik | geser slider volume (panel dan TV) |
| `pop` | pop | tombol muncul (`PrimaryButton`), pill progres/petunjuk, bingkai TV |
| `start` | sparkle | tombol "Mulai Perjalanan" |
| `toggleOn` | klik | suara dinyalakan kembali |
| `zoomOut` / `zoomIn` | whoosh | zoom kamera 02b / zoom ke TV 06d |
| `whooshSoft` | whoosh | crossfade 02c (Scene 02 ke 03), Mulai Ulang, Putar ulang video |
| `planeFlyby` | whoosh | pesawat masuk di 03a |
| `cloudWhoosh` / `cloudSoft` / `chimeAir` | whoosh, impact, sparkle | transisi awan (masuk, menutup, memudar) |
| `giftHover` | sparkle | hover kado |
| `gift` | sparkle | klik kado |
| `paperDrop` / `paperClose` | whoosh | surat jatuh / ditutup (X, Esc, klik latar) |
| `check` | sukses | kado baru dibuka (nadanya naik tiap kado ke-1 sampai ke-8) |
| `reward` | sukses | tombol "Mendarat" muncul (8 kado terbuka) |
| `takeoff` | whoosh | pesawat lepas landas ke bandara |
| `step` | pop | langkah Gasing (tiap siklus jalan, 0,46 s) |
| `squish` / `boing` | pop | Gasing siap / melonjak (`GasingSprite`) |
| `hopUp` / `thud` / `clip` | whoosh, impact, klik | koper melompat, mendarat, tali terpasang |
| `surprise` | impact | Gasing kaget di 06b |
| `tvFlicker` / `tvOn` | sparkle | layar TV berkedip lalu menyala |
| `play` / `pause` | klik | putar / jeda video |
| `oops` | gagal | video ucapan belum ada |
| `fanfare` | sukses | video selesai (kartu penutup, konfeti, kilau) |

## Menambah SFX baru

1. Tambahkan nama ke tipe `SfxName` dan satu entri ke `SFX` di `src/audio/synth.ts`. Resep memakai helper `osc()` (nada), `air()` (noise tersaring), dan `notes()` (arpeggio); isi `dur` (lama), `vol`, dan bila perlu `vary` (variasi pitch), `max` (suara bersamaan), `cd` (jeda minimum, ms).
2. Picu dari kode:
   - Pada alur animasi (`useSequence`): `seq.sfx('nama')` atau `seq.sfx('nama', { delay: 0.5 })`. Tepat di titik yang diinginkan dan otomatis dibatalkan saat scene berganti.
   - Di mana saja: `audio.playSfx('nama', { volume, rate, delay, scope })`. `scope: 'scene'` = dipotong halus saat pindah scene; bawaan `'global'`.
   - Pada tombol: atribut `data-sfx="nama"` (klik) atau `data-sfx-hover="nama"`; `"none"` = diam.

## Kontrol pengguna

Tombol speaker (kanan bawah) = mute global. Tombol di atasnya membuka panel volume untuk tiga kategori (Efek, Suasana, Musik). Pengaturan tersimpan di `localStorage` (`gasing-audio`). Audio otomatis dijeda saat tab disembunyikan.

## Sumber aset bebas lisensi (bila ingin file asli)

- [Kenney](https://kenney.nl/assets?q=audio) - Interface Sounds, Impact Sounds (CC0)
- [Pixabay Sound Effects](https://pixabay.com/sound-effects/) (Pixabay Content License)
- [Mixkit](https://mixkit.co/free-sound-effects/) (Mixkit License)
- [Freesound](https://freesound.org/) dengan filter lisensi CC0

## Catat sumber di sini setelah file ditambahkan

Contoh: `sfx-click.mp3` - Nama suara - situs - lisensi (CC0 / Mixkit License / dibuat sendiri).
