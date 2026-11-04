# Audio

Semua audio dikelola satu modul: `src/audio/audio.ts` (manager, volume, mute, polifoni, limiter), `src/audio/synth.ts` (resep suara sintesis), dan `src/audio/levels.json` (target loudness dan penyeimbang volume per kategori).

Ada dua jenis sumber suara:

- **File** (`public/assets/audio/`, didaftarkan di `manifest.json`): musik, ambience kabin dan bandara, `paperDrop`, dan `airplaneChimes`.
- **Sintesis** (dibuat dari osilator/noise lewat Web Audio API): semua SFX lain, ambience `wind` dan `wheels`, serta cadangan bila sebuah file hilang atau rusak. Tanpa file, tanpa lisensi, tanpa biaya loading.

## File yang dipakai sekarang

| Nama | File | Dipakai di | Sumber (di `aset proyek/original/`) | Catatan |
| --- | --- | --- | --- | --- |
| `music` | `music-gasing-loop.mp3` | Scene 04 - Peta Kado (fade out saat Mendarat) | `2b. Coba Soal Gasing Loop.mp3` | Tidak di-encode ulang (loop tetap gapless); volumenya dikurangi lewat `mixDb.music`. |
| `cabin` | `amb-cabin.m4a` | Scene 02 - Kabin Pesawat (loop) | `inside airplane ambience 2.mp3` | Senyap awal/akhir dipotong; loop diberi crossfade 1,5 s. |
| `airport` | `amb-airport.m4a` | Scene 05 - Bandara Bagasi dan Scene 06-08 (loop) | `Airport Ambience.wav` | WAV 11,4 MB menjadi AAC 1,0 MB; loop diberi crossfade 2 s. |
| `paperDrop` | `sfx-paperDrop.m4a` | Scene 04, surat jatuh (04b) | `Flip page.mp3` | Dipotong 113 ms di awal dan 223 ms di akhir; puncak suara ~0,25 s. |
| `airplaneChimes` | `sfx-airplaneChimes.m4a` | Scene 02 (02b), denting pramugari | `airplane chimes.mp3` | Dua denting (~2,2 s), diputar sekali per kunjungan pada detik ke-3,4. |

Format `.m4a` (AAC) dipilih karena ringan dan didukung semua browser; titik awalnya akurat (latensi awal < 5 ms, sudah diuji).

## Ambience sintesis (loop)

| Nama | Dipakai di | Keterangan |
| --- | --- | --- |
| `wind` | Scene 03 - Pesawat di Langit | angin |
| `wheels` | Scene 05 (05c) | roda koper, hanya saat koper ditarik berjalan |

`cabin` dan `airport` juga punya cadangan sintesis (dipakai hanya bila file-nya hilang).

## Level audio (volume seragam)

Dua mekanisme, semuanya diatur di `src/audio/levels.json`:

| Kategori | Target loudness (LUFS) | Isi |
| --- | --- | --- |
| `ambience` | -22 | loop ambience (kabin, bandara, angin, roda) |
| `accent` | -19 | `airplaneChimes` |
| `ui` | -19 | klik, hover, tick, pop, play/pause, `toggleOn`, `giftHover` |
| `transition` | -18 | whoosh dan transisi (`zoomOut`, `zoomIn`, `whooshSoft`, `planeFlyby`, `cloudWhoosh`, `cloudSoft`, `takeoff`) |
| `action` | -16 | aksi dan karakter (`paperDrop`, `paperClose`, `step`, `hopUp`, `thud`, `boing`, `surprise`, `tvFlicker`, `tvOn`, `oops`) |
| `reward` | -14 | `start`, `reward`, `fanfare` (sedikit menonjol) |
| `music` | -20 | musik |

- **File** dinormalisasi ke target kategorinya (EBU R128, true peak maks. -1,5 dBTP) oleh `npm run audio`.
- **SFX/loop sintesis** dikalibrasi ke target yang sama (`vol` tiap SFX di `synth.ts`, `LOOP_PEAK` untuk loop), memakai `scripts/measure-synth-levels.js`.
- **`mixDb`** di `levels.json` = penyesuaian akhir per kategori saat diputar (dB). Ubah angka ini bila ingin menyeimbangkan tanpa menyentuh file. Contoh: ambience terlalu keras, ubah `"ambience": 0` menjadi `-3`.
- Suara yang puncaknya tinggi (mis. `tvFlicker`, `fanfare`) tidak bisa dinaikkan sampai target tanpa clipping, jadi sedikit lebih pelan dari targetnya. Ada limiter di keluaran sebagai pengaman.

## Menambah atau mengganti suara dengan file

1. Taruh file sumber (mp3/wav/dll.) di `aset proyek/`.
2. Tambahkan satu entri di `scripts/audio-sources.json` (`name`, `src`, `out`, `category`, `trim`).
3. Jalankan:

   ```bash
   npm run audio
   ```

   Script mencadangkan sumber ke `aset proyek/original/`, memotong senyap, mengukur dan menormalisasi loudness, meng-encode ke `public/assets/audio/`, dan memperbarui `manifest.json`. `npm run audio -- cabin` memproses satu item saja.
4. Untuk SFX baru, tambahkan juga nama di `SfxName` dan satu entri di `SFX` (dan `SFX_CAT`) pada `src/audio/synth.ts` (resep cadangan, boleh sederhana), lalu picu dari kode (lihat di bawah).

Script butuh **ffmpeg** (di PATH, atau set variabel `FFMPEG` ke lokasi `ffmpeg.exe`). Memasangnya di Windows: `winget install Gyan.FFmpeg`.

## Daftar SFX

| Nama | Kategori | Dipicu |
| --- | --- | --- |
| `click` | ui | semua tombol (`App.tsx`, bawaan `data-sfx`) |
| `hover` | ui | hover tombol (mouse saja, dibatasi frekuensinya) |
| `tick` | ui | geser slider volume (panel dan TV) |
| `pop` | ui | tombol muncul (`PrimaryButton`), pill progres/petunjuk, bingkai TV |
| `toggleOn` | ui | suara dinyalakan kembali |
| `giftHover` | ui | hover kado |
| `play` / `pause` | ui | putar / jeda video |
| `zoomOut` / `zoomIn` | transition | zoom kamera 02b / zoom ke TV 06d |
| `whooshSoft` | transition | crossfade 02c (Scene 02 ke 03), Mulai Ulang, Putar ulang video |
| `planeFlyby` | transition | pesawat masuk di 03a |
| `cloudWhoosh` / `cloudSoft` | transition | transisi awan (masuk, menutup) |
| `takeoff` | transition | pesawat lepas landas (04d) |
| `paperDrop` | action | surat jatuh (file) |
| `paperClose` | action | surat ditutup (X, Esc, klik latar) |
| `step` | action | langkah Gasing (tiap siklus jalan, 0,46 s) |
| `hopUp` / `thud` | action | koper melompat, mendarat |
| `boing` | action | Gasing melonjak (`GasingSprite`) |
| `surprise` | action | Gasing kaget di 06b |
| `tvFlicker` / `tvOn` | action | layar TV berkedip lalu menyala |
| `oops` | action | video ucapan belum ada |
| `start` | reward | tombol "Mulai Perjalanan" |
| `reward` | reward | tombol "Mendarat" muncul (8 kado terbuka) |
| `fanfare` | reward | video selesai (kartu penutup, konfeti, kilau) |
| `airplaneChimes` | accent | denting pramugari di Scene 02 (file) |

SFX per scene: lihat `SCENES.md`.

## Memicu SFX dari kode

- Pada alur animasi (`useSequence`): `seq.sfx('nama')` atau `seq.sfx('nama', { delay: 0.5 })`. Tepat di titik yang diinginkan dan otomatis dibatalkan saat scene berganti.
- Di mana saja: `audio.playSfx('nama', { volume, rate, delay, scope })`. `scope: 'scene'` = dipotong halus saat pindah scene; bawaan `'global'`.
- Pada tombol: atribut `data-sfx="nama"` (klik) atau `data-sfx-hover="nama"`; `"none"` = diam.

## Kontrol pengguna

Tombol speaker (kanan bawah) = mute global. Tombol di atasnya membuka panel volume untuk tiga kategori (Efek, Suasana, Musik). Pengaturan tersimpan di `localStorage` (`gasing-audio`). Audio otomatis dijeda saat tab disembunyikan.

## Sumber aset bebas lisensi (bila ingin menambah file)

- [Kenney](https://kenney.nl/assets?q=audio) - Interface Sounds, Impact Sounds (CC0)
- [Pixabay Sound Effects](https://pixabay.com/sound-effects/) (Pixabay Content License)
- [Mixkit](https://mixkit.co/free-sound-effects/) (Mixkit License)
- [Freesound](https://freesound.org/) dengan filter lisensi CC0

## Catat sumber di sini setelah file ditambahkan

File `inside airplane ambience 2`, `Airport Ambience`, `Flip page`, dan `airplane chimes` diberikan oleh pemilik proyek; **lisensi/sumber aslinya belum tercatat**. Mohon isi di sini:

| File | Sumber | Lisensi |
| --- | --- | --- |
| `inside airplane ambience 2.mp3` | (isi) | (isi) |
| `Airport Ambience.wav` | (isi) | (isi) |
| `Flip page.mp3` | (isi) | (isi) |
| `airplane chimes.mp3` | (isi) | (isi) |
