# Daftar Scene

Nama resmi scene untuk feedback dan diskusi: sebut **nomor + nama**, mis. "ubah animasi di **Scene 05 - Bandara Bagasi**" atau "tempo **05b Koper Melompat** terlalu cepat".

Sumber kebenaran di kode: `src/data/scenes.ts` (`SCENE_LIST`). **Setiap ada scene baru, perbarui kedua tempat itu dan file ini.**

## Alur pengguna

```
01 Layar Pembuka
   └─ klik "Mulai Perjalanan"
02 Kabin Pesawat ──(crossfade 02c)──▶ 03 Pesawat di Langit ──(awan 03c)──▶ 04 Peta Kado
                                                                               │  ▲   ▲
                           "Mulai Ulang" ──▶ kembali ke 02                      │  │   │ "Kembali ke Peta" (awan 07c)
                                                                         (awan 04e)  │   │
                                                                               ▼  │   │
                                                         05 Bandara Bagasi ──▶ 06 Gasing Melihat TV ──▶ 07 Video Ucapan ──▶ 08 Kartu Penutup
```

## Scene

| No. | Nama | Deskripsi | File |
| --- | --- | --- | --- |
| 01 | Layar Pembuka | Layar loading dengan Gasing berpatroli dan tombol "Mulai Perjalanan". | `src/scenes/Scene01LayarPembuka.tsx` |
| 02 | Kabin Pesawat | Gasing duduk di kabin pesawat, kamera zoom keluar, lalu crossfade ke langit. | `src/scenes/Scene02KabinPesawat.tsx` |
| 03 | Pesawat di Langit | Pesawat meluncur masuk dan melayang di antara awan dengan jejak garis putih dari knalpot mesin, lalu awan menutup layar. | `src/scenes/Scene03PesawatDiLangit.tsx`, `components/PlaneTrail.tsx` |
| 04 | Peta Kado | Peta Indonesia dengan 9 kado berisi surat (pop-up Genie); setelah semua terbuka, pesawat mendarat. Di layar kotak/ponsel peta bisa digeser. | `src/scenes/Scene04PetaKado.tsx`, `components/LetterModal.tsx`, `components/GiftHotspot.tsx`, `data/gifts.ts` |
| 05 | Bandara Bagasi | Gasing mengambil koper dari ban berjalan lalu berjalan ke kanan. | `src/scenes/Scene05BandaraBagasi.tsx`, `components/GasingSprite.tsx`, `components/Baggage.tsx` |
| 06 | Gasing Melihat TV | Gasing tiba di lobi dengan TV besar, kaget, berbalik menghadap TV, TV menyala, lalu kamera zoom ke layar. | `src/scenes/Scene06GasingMelihatTv.tsx` (fase `room`) |
| 07 | Video Ucapan | Layar TV penuh dengan pemutar video ucapan (atau placeholder bila video belum ada). | `src/scenes/Scene06GasingMelihatTv.tsx` (fase `tv`), `components/TvPlayer.tsx` |
| 08 | Kartu Penutup | Kartu "Selamat Ulang Tahun" dengan konfeti dan tombol putar ulang. | `src/scenes/Scene06GasingMelihatTv.tsx` (`end-card`), `components/Confetti.tsx` |

> Scene 06, 07, dan 08 hidup dalam satu file/komponen karena berbagi state (kamera, status TV). Penandanya ada sebagai komentar di file itu.

## Sub-bagian

| Kode | Nama | Keterangan | Waktu kira-kira |
| --- | --- | --- | --- |
| 01a | Gasing Berpatroli | Gasing berjalan bolak-balik selama loading, dengan bunyi langkah `step` | sampai aset siap |
| 01b | Tombol Mulai | Tombol muncul setelah aset siap | - |
| 02a | Fade dari Hitam | Layar terang perlahan, dengung kabin | 0 - 2,4 s |
| 02b | Zoom Keluar | Kamera menarik mundur dari Gasing | 2,4 - 6,0 s |
| 02c | Crossfade ke Langit | Cross-fade ke Scene 03 | 1,4 s |
| 03a | Pesawat Masuk | Pesawat meluncur dari kiri | 0,3 - 1,7 s |
| 03b | Pesawat Melayang | Pesawat melayang, awan hanyut | sampai 5,6 s |
| 03c | Awan Menutup (ke Peta) | `CloudTransition` ke Scene 04 | 2,6 s |
| 04a | Peta Terbuka | Peta masuk, petunjuk "Klik kado..." | ~2,6 s |
| 04b | Surat Kado | Tiap kado diklik membuka surat (`LetterModal`) | per kado |
| 04c | Semua Kado Terbuka | Semua kado terbuka: ronde 1 tombol teks "Mendarat"; ronde 2 (setelah pernah mendarat) tombol "Mendarat" berupa ikon pesawat di peta (`LandIconButton`) dan "Mulai Ulang" | - |
| 04d | Pesawat Lepas Landas | Pesawat terbang melengkung keluar layar, jejak garis putih tertinggal di lintasan | 3,4 s |
| 04e | Awan Menutup (ke Bandara) | `CloudTransition` ke Scene 05 | 2,6 s |
| 04f | Pilih BGM | Tombol not musik di pojok kanan atas membuka panel 3 lagu (`components/BgmPicker.tsx`, daftar di `audio/bgm.ts`); bisa dipakai kapan saja selama di peta | kapan saja |
| 05a | Ban Berjalan | Koper bergerak di ban, Gasing datang menjemput | 0 - 5,2 s |
| 05b | Koper Melompat | Koper melompat dari ban ke belakang Gasing | ~1 s |
| 05c | Berjalan ke Kanan | Gasing menarik koper, kamera ikut bergeser | ~4,4 s |
| 06a | Gasing Masuk | Gasing berjalan masuk dari luar layar kiri (bobbing + langkah) dan berhenti di kiri bawah TV | 0,5 - 3,5 s |
| 06b | Gasing Kaget | Bingkai `gasing-alert` (tanda seru ada di gambar), Gasing melonjak | ~1,6 s |
| 06b2 | Gasing Berbalik Menghadap TV | Badan menyempit (`gTurn` 0,7 s), bingkai berganti ke `gasing-mirrored` (membelakangi kamera); topi ikut bergeser halus | ~0,7 s |
| 06c | TV Menyala | Layar berkedip lalu terang | 1,4 s |
| 06d | Zoom ke TV | Kamera zoom sampai TV memenuhi layar | 2,2 s |
| 07a | Video Diputar | Video ucapan (kontrol: putar/jeda, volume, layar penuh) | durasi video |
| 07b | Video Belum Ada | Placeholder "Video segera hadir" + "Lewati ke penutup" | bila `ucapan-ultah.mp4` tidak ada |
| 07c | Awan Menutup (ke Peta) | Tombol "Kembali ke peta" (di kartu penutup Scene 08) | 2,6 s |
| 08a | Konfeti dan Kartu | Kartu penutup muncul setelah video selesai | ~3 s |
| 08b | Putar Ulang | Tombol "Putar ulang video" | - |

Elemen yang tampil di semua scene dan tidak diberi nomor: tombol suara dan tombol gerigi pengaturan volume (`components/AudioToggle.tsx`). Tombol suara, gerigi, dan layar penuh (`components/FullscreenToggle.tsx`) disembunyikan dengan fade 250 ms HANYA selama Scene 07 (supaya tidak menutupi video TV) dan muncul lagi di Scene 08 serta saat keluar scene: Scene 06 melaporkan `onHideControls` ke `App`, yang meneruskan `hidden` ke kedua komponen (tetap terpasang, jadi mute/volume/BGM tidak berubah; saat tersembunyi `visibility: hidden` + `pointer-events: none`). `CloudTransition` (`components/CloudTransition.tsx`) satu komponen yang dipakai di 03c, 04e, dan 07c.

## SFX per scene

Waktu dihitung dari saat scene tampil dan bersifat kira-kira. Detail tiap SFX: `AUDIO_CREDITS.md`.

Tingkat volume (diatur di `src/audio/mix.ts`): **minor** (pelan, ±10 dB di bawah utama) = `click`, `hover`, `tick`, `pop`, `toggleOn`, `giftHover`, `play`, `pause`, `planeFlyby`, `cloudWhoosh`, `cloudSoft`, `paperClose`, `takeoff`, `step`; **main** (sedang) = `paperDrop`, `airplaneChimes`, `hopUp`, `thud`, `boing`, `surprise`, `tvFlicker`, `tvOn`, `oops`; **key** (paling menonjol) = `start`, `reward`, `fanfare`; loop (`cabin`, `airport`, `wind`, `wheels`) = ambience, latar yang datar.

| Scene | SFX (urutan) |
| --- | --- |
| 01 Layar Pembuka | 01a: `step` satu per langkah Gasing berpatroli (tepat saat kaki menapak di akhir tiap lompat-kecil 0,5 s; berhenti begitu layar pembuka keluar; tanpa bunyi bila animasi dimatikan, dan baru terdengar setelah pengguna berinteraksi karena aturan autoplay browser); 01b: `start` (klik Mulai Perjalanan); hover tombol tanpa suara |
| 02 Kabin Pesawat | loop `cabin` (file); `airplaneChimes` (3,4 s, sekali per kunjungan, dua denting ~2,2 s); zoom keluar 02b dan crossfade 02c tanpa SFX |
| 03 Pesawat di Langit | loop `wind`; 03a: `planeFlyby` (0,3 s); 03c: `cloudWhoosh`, lalu `cloudSoft` (+1,1 s) |
| 04 Peta Kado | BGM pilihan (loop `music`, default "Orang Jenius Suka Berhitung"; pilih lewat tombol not musik 04f); 04a: `pop` (0,9 s dan 1,3 s); 04b: `giftHover`, `paperDrop` (file, -7,5 dB, saat kado diklik), `paperClose`; 04c: `reward` (Mendarat muncul), `hover` (hover "Mendarat"); 04d: `takeoff`; 04e: `cloudWhoosh`, `cloudSoft` |
| 05 Bandara Bagasi | loop `airport` (file); 05a: `step` tiap 0,46 s; 05b: `hopUp`, `thud`, `boing`; 05c: `step`, loop `wheels` (file `suitcase rolling`, mulai/berhenti bersama Gasing berjalan menarik koper) |
| 06 Gasing Melihat TV | loop `airport`; `pop` (tombol Kembali); 06a: `step`; 06b: `surprise`; 06c: `tvFlicker` (lalu `tvOn`); 06d: zoom ke TV tanpa SFX; `pop` (bingkai TV) |
| 07 Video Ucapan | 07a: `play` / `pause`, `tick` (slider volume); 07b: `oops`; 07c: `click`, `cloudWhoosh`, `cloudSoft` |
| 08 Kartu Penutup | 08a: `fanfare`; 08b: hanya `click` (Putar ulang) |

Tombol suara (`click`, `tick`, `toggleOn`) berlaku di semua scene. **Hover hanya bersuara pada kado (`giftHover`) dan tombol "Mendarat" (`hover`)**; tombol lain tidak. SFX `chimeAir`, `gift`, `check`, `squish`, `clip`, `zoomOut`, `zoomIn`, `whooshSoft`, dan loop `belt` sudah dihapus (atas feedback); gerak koper dan Gasing tetap punya suara lewat `hopUp`, `thud`, `boing`, dan `step`.

## Alat bantu debug (hanya `npm run dev`, tidak ikut build final)

- **Label scene aktif** di pojok kiri bawah, mis. `DEV  Scene 05 - Bandara Bagasi`. Berubah otomatis saat scene berganti (06 → 07 → 08 juga).
- **Menu "lompat..."** di label itu: pilih scene, halaman dimuat ulang langsung ke sana.
- **Lompat lewat URL:**

  | URL | Hasil |
  | --- | --- |
  | `http://localhost:5173/?scene=02` ... `?scene=08` | langsung ke scene itu |
  | `?scene=04c` | Scene 04 dengan semua kado terbuka (tombol Mendarat tampil) |
  | `?scene=07` / `?scene=08` | TV layar penuh / kartu penutup, tanpa animasi 06a-06d |
  | `?scene=04&all=1` | semua kado terbuka dan "Mulai Ulang" tersedia |
  | `?scene=scene3` | format lama tetap berfungsi (`scene1..scene5` = Scene 02..06) |

- Setelah halaman dimuat, **klik "Mulai Perjalanan" dulu**; browser mewajibkan klik itu untuk membuka audio. Scene yang dipilih langsung tampil setelahnya.
- Konsol browser (dev) mencatat `[Scene 05 - Bandara Bagasi] tampil` setiap scene masuk.
- Tambahan untuk Scene 02: `?still=1` menahan kabin pada tampilan penuh (tanpa zoom dan pindah scene).

Kode alat ini ada di `src/dev/` (`DevSceneBadge.tsx`, `devJump.ts`, `sceneTag.ts`) dan dipasang hanya bila `import.meta.env.DEV`; build produksi tidak memuatnya.

## Catatan aset

Aset visual terbaru (dari `aset proyek/`, diproses oleh `npm run assets:visual` = `tools/process-visual.mjs` dan `npm run video` = `tools/process-video.mjs`):

| Dipakai di | File | Sumber |
| --- | --- | --- |
| Scene 03 latar | `images/langit-awan.webp` (`IMG.langitBg`) | Bright Layered Cloudscape.png |
| Scene 03 pesawat | `images/pesawat-samping.webp` (`IMG.pesawatLangit`) | Blue and White Airplane Side View.png (serpihan/halo tepi alpha dibersihkan) |
| Scene 05 latar | `images/bandara-bagasi.webp` (`IMG.bandara`) | Modern Airport Baggage Claim.png |
| Scene 06 latar | `images/bandara-lobi.webp` (`IMG.ruangTvBg`, ukuran `LOBBY` di `config.ts`) | Modern Airport Lobby with Scenic Views.png |
| Scene 07-08 bingkai TV | `images/tv-monitor.webp` (`IMG.tv`); layar = `.tv-window` di `index.css` (x 65-1609, y 58-863 px gambar) | Hyper-Realistic Dark Screen Monitor.png |
| Semua maskot: topi | `images/topi-pesta.webp` (`IMG.partyHat`), penempatan per pose di `components/PartyHat.tsx` | Striped Party Hat with Yellow Puffs.png |
| Scene 06b: mata+alis kaget di depan topi | `images/gasing-alert-mata.webp` (potongan dari gambar Alert, posisi identik) | Alert Green Spinning Top Mascot.png |
| Semua maskot: badan | `images/gasing-badan.webp` (`IMG.gasingBadan`) | Glossy Green Spinning Top Mascot.png |
| Semua maskot: mata terbuka / tertutup (kedip) | `images/mata-buka.webp`, `images/mata-tutup.webp` | Glossy Cartoon Eyes with Arched Brows.png, Sleeping Eyes and Arched Brows.png |
| Scene 06b kaget | `images/gasing-alert.webp` | Alert Green Spinning Top Mascot.png |
| Scene 06b2 menghadap TV | `images/gasing-mirrored.webp` | Mirrored Lime Green Spinning Top.png |
| Scene 07 video | `video/ucapan-ultah.mp4` (H.264 1280x720, dimuat lazy saat Scene 07) | Ucapan Ultah Prof 63.mp4 (disimpan lokal, tidak di-commit) |

Maskot memakai satu komponen (`components/Mascot.tsx`). Urutan layer dari belakang ke depan: **badan** (Glossy; saat pose khusus bingkai utuh alert / mirrored, crossfade 160 ms), **topi pesta**, lalu **mata + alis paling depan** (menimpa topi). Saat normal, mata = layer mata terbuka + mata tertutup (satu transformasi, tanpa lompatan posisi; posisinya dinaikkan agar sejajar dengan mata aset maskot lama). Saat kaget, mata + alis dipotong dari gambar alert dan digambar lagi di atas topi; pose menghadap TV tidak punya wajah. Kedip lewat Web Animations: terbuka -> tertutup 80 ms, tertutup 65 ms, tertutup -> terbuka 80 ms; jeda acak 2-6 detik, 22% kedip ganda; pose khusus tidak berkedip. Topi: kerapatan "A" untuk normal/menghadap TV/pesawat dan lebih rapat ("B": ditekan 90% dan sedikit miring) saat kaget, berubah halus (transisi 0,22 s) dan selalu menutupi seluruh tanduk. Dipakai di Scene 01, 02, 05, 06; Scene 04 memakai ilustrasi pesawat+Gasing yang menyatu (`plane-mascot.png`), jadi hanya topinya yang diganti.

Jejak pesawat: `components/PlaneTrail.tsx` (kanvas 2D): satu garis putih tapered yang wavy, sempit di knalpot lalu melebar dan memudar. Titik asal = elemen penanda `.exhaust-marker` di dalam pesawat, jadi mengikuti posisi/gerak pesawat; berhenti dan hilang saat scene dilepas.

Nama file aset lama (yang tidak diganti) mengikuti naskah desain, bukan nomor scene: `scene3-bg.webp` = **Scene 04**. Skrip `tools/process-assets*.mjs` tidak lagi menulis ulang aset yang sudah diganti (daftar `RETIRED`).
