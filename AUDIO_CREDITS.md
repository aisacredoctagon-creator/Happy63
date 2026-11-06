# Audio

Semua audio dikelola satu modul: `src/audio/audio.ts` (manager, volume, mute, polifoni, pengaman puncak), `src/audio/synth.ts` (registrasi dan resep suara sintesis), `src/audio/mix.ts` (**hierarki volume**), dan `src/audio/levels.json` (target kalibrasi).

Ada dua jenis sumber suara:

- **File** (`public/assets/audio/`, didaftarkan di `manifest.json`): tiga lagu BGM (dimuat lazy), ambience kabin dan bandara, loop roda koper (`wheels`), `paperDrop`, dan `airplaneChimes`.
- **Sintesis** (dibuat dari osilator/noise lewat Web Audio API): semua SFX lain, ambience `wind`, serta cadangan bila sebuah file hilang atau rusak. Tanpa file, tanpa lisensi, tanpa biaya loading.

## Hierarki volume

Diatur di **satu tempat**: `VOLUME` di `src/audio/mix.ts` (dalam dB; 0 = level hasil normalisasi/kalibrasi). Mengubah angka di sana langsung menyeimbangkan seluruh tingkat tanpa menyentuh file audio.

| Tingkat | Isi | `VOLUME` (dB) | Efektif (LUFS) |
| --- | --- | --- | --- |
| `ambience` | loop latar: kabin, bandara, angin, roda | 0 | -22 (paling datar, hanya latar) |
| `minor` | transisi, whoosh, klik/hover, pop, muncul/hilang, langkah | -10 | sekitar -26 (±10 dB di bawah `main`) |
| `main` | aksi utama di scene: `paperDrop`, `airplaneChimes`, koper, Gasing, TV | 0 | sekitar -16 |
| `key` | momen kunci/reward: `start`, `reward`, `fanfare` | +3 | sekitar -13 sampai -15 (paling menonjol) |
| `music` | BGM (ketiga lagu sudah dinormalisasi) | 0 | -20 |

- **Tiap SFX wajib punya `tier`** di registrasinya (`synth.ts`; TypeScript menolak SFX tanpa tier), jadi SFX baru otomatis mengikuti gain tingkatnya.
- **Batas SFX kecil:** paling banyak 4 SFX `minor` berbunyi bersamaan (`MAX_CONCURRENT` di `mix.ts`); yang berprioritas 2 (mis. awan, `takeoff`) tetap lolos. Total maksimum 14 suara.
- **Penyesuaian per SFX:** `trimDb` di registrasi SFX (`synth.ts`) menambah/mengurangi gain satu SFX di atas tingkatnya, tanpa menyentuh file. Dipakai oleh `paperDrop` (-7,5 dB: sebelumnya 0 dB, efektif -16 LUFS; sekarang efektif sekitar -23,5 LUFS). `paperDrop` hanya dipakai di satu tempat (surat di Scene 04, semua 8 kado), jadi perubahan berlaku di seluruh pemakaiannya.
- **Variasi:** SFX yang sering berulang (`click`, `hover`, `tick`, `pop`, `giftHover`, `step`, `boing`) bervariasi acak ±5% pada pitch dan volume (`MAX_VARY`), tetap di dalam batas tingkatnya.
- **Pengaman puncak:** soft-clipper di keluaran meloloskan sinyal di bawah -3 dBFS apa adanya dan melunakkan puncak di atasnya (misalnya saat `key` +3 dB bertumpuk dengan suara lain). `DynamicsCompressor` bawaan browser sengaja tidak dipakai karena menekan SFX pendek ±10 dB.
- Suara yang puncaknya tinggi (`tvFlicker`, `tvOn`, `surprise`, `fanfare`) tidak bisa dinaikkan sampai level acuan tanpa clipping, jadi sedikit lebih pelan dari tingkatnya.

### Normalisasi dan kalibrasi (level acuan)

`src/audio/levels.json` berisi target kalibrasi: ambience -22 LUFS, **semua SFX -16 LUFS**, musik -20 LUFS, true peak maks. -1,5 dBTP.

- **File** dinormalisasi ke target itu oleh `npm run audio`.
- **SFX/loop sintesis** dikalibrasi ke target yang sama (`vol` tiap SFX di `synth.ts`, `LOOP_PEAK` untuk loop) memakai `scripts/measure-synth-levels.js` (tempel di konsol browser saat `npm run dev`). Jalankan ulang setelah menambah atau mengubah SFX sintesis.
- Ketiga lagu BGM juga dinormalisasi ke -20 LUFS, jadi `VOLUME.music` = 0.

## File yang dipakai sekarang

| Nama | File | Dipakai di | Sumber (di `aset proyek/original/`) | Catatan |
| --- | --- | --- | --- | --- |
| `cabin` | `amb-cabin.m4a` | Scene 02 - Kabin Pesawat (loop) | `inside airplane ambience 2.mp3` | -22 LUFS; senyap awal/akhir dipotong; loop diberi crossfade 1,5 s. |
| `airport` | `amb-airport.m4a` | Scene 05 - Bandara Bagasi dan Scene 06-08 (loop) | `Airport Ambience.wav` | -22 LUFS; WAV 11,4 MB menjadi AAC 1,0 MB; crossfade 2 s. |
| `paperDrop` | `sfx-paperDrop.m4a` | Scene 04, surat jatuh (04b) | `Flip page.mp3` | -16 LUFS; dipotong 113 ms awal dan 223 ms akhir; puncak suara ~0,25 s. Diputar **-7,5 dB** lewat `trimDb` (lihat di bawah). |
| `wheels` | `amb-wheels.m4a` | Scene 05 (05c), loop roda koper hanya saat koper ditarik berjalan | `suitcase rolling.mp3` | Dinormalisasi ke **-26 LUFS** (setara tingkat `minor`, lebih ringan dari ambience); dipotong 49 ms awal dan 27 ms akhir; loop diberi crossfade 1 s. |
| `airplaneChimes` | `sfx-airplaneChimes.m4a` | Scene 02 (02b), denting pramugari | `airplane chimes.mp3` | -16 LUFS (tingkat `main`); dua denting (~2,2 s), sekali per kunjungan pada detik ke-3,4. |

## BGM (musik latar, pilihan di Scene 04)

Tombol not musik di pojok kanan atas Scene 04 membuka panel pilihan lagu. Daftar lagu ada di **satu tempat**: `BGM_TRACKS` di `src/audio/bgm.ts` (judul, file, panjang crossfade loop, lagu bawaan `BGM_DEFAULT`, lama crossfade ganti lagu `BGM_FADE` = 0,8 s).

| Lagu (bawaan = pertama) | File | Sumber (di `aset proyek/original/`) | Ukuran sebelum → sesudah | LUFS | Dipotong awal / akhir |
| --- | --- | --- | --- | --- | --- |
| **Orang Jenius Suka Berhitung** | `bgm-orang-jenius-loop.m4a` | `3b. Orang Jenius Suka Berhitung Loop.mp3` (loop 100 BPM, 42 birama) | 4,2 MB → 2,6 MB | −14,2 → −20,0 | tidak dipotong (kisi loop dijaga) |
| **Coba Soal Gasing** (bawaan) | `bgm-coba-soal-gasing-loop.m4a` | `2b. Coba Soal Gasing Loop.mp3` (loop 110 BPM, 36 birama) | 3,2 MB → 2,0 MB | −13,8 → −20,0 | tidak dipotong (kisi loop dijaga) |
| **Gasing Medley** | `bgm-gasing-medley.m4a` | `Gasing Medley v4 Mastered (1).wav` | 52,2 MB → 4,2 MB (−92%) | −14,0 → −20,1 | 1,5 s / 8,3 s (fade-out) |

Total 74,0 MB menjadi 7,6 MB.

- **Satu BGM pada satu waktu:** pilihan baru dimuat dulu, lalu crossfade 0,8 s; lagu lama berhenti setelahnya. Berganti cepat berkali-kali aman (hanya pilihan terakhir yang dipakai).
- **Streaming + lazy-load:** BGM **di-stream lewat `<audio>`** (`src/audio/bgmPlayer.ts`), tidak di-decode utuh ke memori (decode lagu 3 menit ±70-80 MB PCM membuat tab iPhone dimatikan Safari). Hanya lagu terpilih yang diunduh; lagu lain baru saat dipilih. Tetap tersambung ke jalur gain manager, jadi mute, volume "Musik", dan duck berlaku.
- **Loop mulus (Coba Soal Gasing dan Orang Jenius):** file loop = 1 ketukan senyap + N birama + 2 birama ekor reverb, jadi diputar dengan **overlap ekor** (salinan berikutnya mulai tiap N birama, ekor lama dibiarkan habis di bawahnya; tanpa fade dan tanpa jeda). Analisis dan alasan lengkap: `docs/BGM-LOOP.md`.
- **Loop mulus (Gasing Medley, lagu utuh):** fade-out/peluruhan akhir dipotong saat konversi. Saat sisa waktu lagu tinggal 2 detik (1,5 detik untuk Coba Soal Gasing), elemen `<audio>` kedua mulai dari awal dan keduanya di-crossfade equal-power, lalu yang lama dilepas (dua elemen bergantian). Lagu "Coba Soal Gasing" aslinya punya senyap di awal dan akhir file (jeda tiap putaran); sekarang tanpa jeda.
- **Pilihan lagu TIDAK disimpan:** tiap halaman dimuat (pertama kali atau refresh) BGM selalu kembali ke bawaan "Coba Soal Gasing" (`BGM_DEFAULT`); pilihan hanya berlaku selama sesi halaman, termasuk saat pindah scene. Kunci lama `gasing-bgm` dan `gasing-bgm-v2` dibersihkan dari browser. Mute dan volume tetap tersimpan di `localStorage` seperti biasa.
- **Menambah lagu:** taruh sumbernya di `aset proyek/`, tambahkan item `{ "category": "music", "register": false, "bitrate": "192k", "trimHeadDb": -60, "trimTailDb": -32 }` di `scripts/audio-sources.json` (untuk file loop ekspor DAW pakai `"trim": "none"`, lihat `docs/BGM-LOOP.md`), jalankan `npm run audio`, lalu tambahkan satu entri di `BGM_TRACKS`.
- Cadangan WAV besar (`3a...` dan `Gasing Medley...`, total 71 MB) disimpan lokal di `aset proyek/original/` tetapi tidak di-commit (di `.gitignore`).

Format `.m4a` (AAC) dipilih karena ringan dan didukung semua browser; titik awalnya akurat (latensi awal < 5 ms, sudah diuji).

## Ambience sintesis (loop)

| Nama | Dipakai di | Keterangan |
| --- | --- | --- |
| `wind` | Scene 03 - Pesawat di Langit | angin |

`cabin`, `airport`, dan `wheels` juga punya cadangan sintesis (dipakai hanya bila file-nya hilang).

## Menambah atau mengganti suara dengan file

1. Taruh file sumber (mp3/wav/dll.) di `aset proyek/`.
2. Tambahkan satu entri di `scripts/audio-sources.json` (`name`, `src`, `out`, `category`: `ambience` / `sfx` / `music`, `trim`).
3. Jalankan:

   ```bash
   npm run audio
   ```

   Script mencadangkan sumber ke `aset proyek/original/`, memotong senyap, mengukur dan menormalisasi loudness, meng-encode ke `public/assets/audio/`, dan memperbarui `manifest.json`. `npm run audio -- cabin` memproses satu item saja.
4. Untuk SFX baru, tambahkan juga nama di `SfxName` dan satu entri di `SFX` pada `src/audio/synth.ts` (wajib mengisi `tier`; resep cadangan boleh sederhana), lalu picu dari kode (lihat di bawah).

Script butuh **ffmpeg** (di PATH, atau set variabel `FFMPEG` ke lokasi `ffmpeg.exe`). Memasangnya di Windows: `winget install Gyan.FFmpeg`.

## Daftar SFX dan tingkatnya

| Tingkat | SFX |
| --- | --- |
| **minor** | `click`, `hover`, `tick`, `pop`, `toggleOn`, `giftHover`, `play`, `pause`, `planeFlyby`, `cloudWhoosh`, `cloudSoft`, `paperClose`, `takeoff`, `step` |
| **main** | `paperDrop` (file), `airplaneChimes` (file), `hopUp`, `thud`, `boing`, `surprise`, `tvFlicker`, `tvOn`, `oops` |
| **key** | `start`, `reward`, `fanfare` |

| Nama | Dipicu |
| --- | --- |
| `click` | semua tombol (`App.tsx`, bawaan `data-sfx`) |
| `hover` | hover tombol "Mendarat" saja, baik tombol teks (ronde 1) maupun ikon di peta (`LandIconButton`, ronde 2); mouse saja, tombol lain tidak bersuara saat di-hover |
| `tick` | geser slider volume (panel dan TV) |
| `pop` | tombol muncul (`PrimaryButton`), pill progres/petunjuk, bingkai TV |
| `toggleOn` | suara dinyalakan kembali |
| `giftHover` | hover kado |
| `play` / `pause` | putar / jeda video |
| `planeFlyby` | pesawat masuk di 03a |
| `cloudWhoosh` / `cloudSoft` | transisi awan (masuk, menutup) |
| `takeoff` | pesawat lepas landas (04d) |
| `paperDrop` | surat jatuh (file, -7,5 dB) |
| `paperClose` | surat ditutup (X, Esc, klik latar) |
| `step` | langkah Gasing (tiap siklus jalan, 0,46 s) |
| `hopUp` / `thud` | koper melompat, mendarat |
| `boing` | Gasing melonjak (`GasingSprite`) |
| `surprise` | Gasing kaget di 06b |
| `tvFlicker` / `tvOn` | layar TV berkedip lalu menyala |
| `oops` | video ucapan belum ada |
| `start` | tombol "Mulai Perjalanan" |
| `reward` | tombol "Mendarat" muncul (semua kado terbuka; tombol teks ronde 1 atau ikon di peta ronde 2) |
| `fanfare` | video selesai (kartu penutup, konfeti, kilau) |
| `airplaneChimes` | denting pramugari di Scene 02 (file) |

SFX per scene: lihat `SCENES.md`.

## Memicu SFX dari kode

- Pada alur animasi (`useSequence`): `seq.sfx('nama')` atau `seq.sfx('nama', { delay: 0.5 })`. Tepat di titik yang diinginkan dan otomatis dibatalkan saat scene berganti.
- Di mana saja: `audio.playSfx('nama', { volume, rate, delay, scope })`. `scope: 'scene'` = dipotong halus saat pindah scene; bawaan `'global'`.
- Pada tombol: atribut `data-sfx="nama"` (klik; bawaan `click`) atau `data-sfx-hover="nama"` (hover; **bawaan diam**, hanya kado dan "Mendarat" yang memakainya); `"none"` = diam. `PrimaryButton` punya prop `hoverSfx`.

## Kontrol pengguna

Tombol speaker (kanan bawah) = mute global. Tombol gerigi di atasnya membuka panel volume untuk tiga kategori (Efek, Suasana, Musik). Pengaturan tersimpan di `localStorage` (`gasing-audio-v2`; kunci lama sengaja diabaikan agar suara menyala sebagai bawaan). Audio otomatis dijeda saat tab disembunyikan.

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
