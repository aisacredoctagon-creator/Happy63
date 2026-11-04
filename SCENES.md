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
| 03 | Pesawat di Langit | Pesawat meluncur masuk dan melayang di antara awan, lalu awan menutup layar. | `src/scenes/Scene03PesawatDiLangit.tsx` |
| 04 | Peta Kado | Peta Indonesia dengan 8 kado berisi surat; setelah semua terbuka, pesawat mendarat. | `src/scenes/Scene04PetaKado.tsx`, `components/LetterModal.tsx`, `components/GiftHotspot.tsx`, `data/gifts.ts` |
| 05 | Bandara Bagasi | Gasing mengambil koper dari ban berjalan lalu berjalan ke kanan. | `src/scenes/Scene05BandaraBagasi.tsx`, `components/GasingSprite.tsx`, `components/Baggage.tsx` |
| 06 | Gasing Melihat TV | Gasing tiba di depan TV besar, kaget, TV menyala, lalu kamera zoom ke layar. | `src/scenes/Scene06GasingMelihatTv.tsx` (fase `room`) |
| 07 | Video Ucapan | Layar TV penuh dengan pemutar video ucapan (atau placeholder bila video belum ada). | `src/scenes/Scene06GasingMelihatTv.tsx` (fase `tv`), `components/TvPlayer.tsx` |
| 08 | Kartu Penutup | Kartu "Selamat Ulang Tahun" dengan konfeti dan tombol putar ulang. | `src/scenes/Scene06GasingMelihatTv.tsx` (`end-card`), `components/Confetti.tsx` |

> Scene 06, 07, dan 08 hidup dalam satu file/komponen karena berbagi state (kamera, status TV). Penandanya ada sebagai komentar di file itu.

## Sub-bagian

| Kode | Nama | Keterangan | Waktu kira-kira |
| --- | --- | --- | --- |
| 01a | Gasing Berpatroli | Gasing berjalan bolak-balik selama loading | sampai aset siap |
| 01b | Tombol Mulai | Tombol muncul setelah aset siap | - |
| 02a | Fade dari Hitam | Layar terang perlahan, dengung kabin | 0 - 2,4 s |
| 02b | Zoom Keluar | Kamera menarik mundur dari Gasing | 2,4 - 6,0 s |
| 02c | Crossfade ke Langit | Cross-fade ke Scene 03 | 1,4 s |
| 03a | Pesawat Masuk | Pesawat meluncur dari kiri | 0,3 - 1,7 s |
| 03b | Pesawat Melayang | Pesawat melayang, awan hanyut | sampai 5,6 s |
| 03c | Awan Menutup (ke Peta) | `CloudTransition` ke Scene 04 | 2,6 s |
| 04a | Peta Terbuka | Peta masuk, petunjuk "Klik kado..." | ~2,6 s |
| 04b | Surat Kado | Tiap kado diklik membuka surat (`LetterModal`) | per kado |
| 04c | Semua Kado Terbuka | 8 kado terbuka, tombol "Mendarat" (dan "Mulai Ulang") muncul | - |
| 04d | Pesawat Lepas Landas | Pesawat terbang melengkung keluar layar | 3,4 s |
| 04e | Awan Menutup (ke Bandara) | `CloudTransition` ke Scene 05 | 2,6 s |
| 05a | Ban Berjalan | Koper bergerak di ban, Gasing datang menjemput | 0 - 5,2 s |
| 05b | Koper Melompat | Koper melompat dari ban ke belakang Gasing | ~1 s |
| 05c | Berjalan ke Kanan | Gasing menarik koper, kamera ikut bergeser | ~4,4 s |
| 06a | Gasing Masuk | Gasing berjalan ke depan TV | 0,5 - 1,8 s |
| 06b | Gasing Kaget | Tanda seru, Gasing melonjak | ~1,6 s |
| 06c | TV Menyala | Layar berkedip lalu terang | 1,4 s |
| 06d | Zoom ke TV | Kamera zoom sampai TV memenuhi layar | 2,2 s |
| 07a | Video Diputar | Video ucapan (kontrol: putar/jeda, volume, layar penuh) | durasi video |
| 07b | Video Belum Ada | Placeholder "Video segera hadir" + "Lewati ke penutup" | bila `ucapan.mp4` tidak ada |
| 07c | Awan Menutup (ke Peta) | Tombol "Kembali ke Peta" (tersedia di Scene 06-08) | 2,6 s |
| 08a | Konfeti dan Kartu | Kartu penutup muncul setelah video selesai | ~3 s |
| 08b | Putar Ulang | Tombol "Putar ulang video" | - |

Elemen yang tampil di semua scene dan tidak diberi nomor: tombol suara dan panel volume (`components/AudioToggle.tsx`). `CloudTransition` (`components/CloudTransition.tsx`) satu komponen yang dipakai di 03c, 04e, dan 07c.

## SFX per scene

Waktu dihitung dari saat scene tampil dan bersifat kira-kira. Detail tiap SFX: `AUDIO_CREDITS.md`.

Tingkat volume (diatur di `src/audio/mix.ts`): **minor** (pelan, ±10 dB di bawah utama) = `click`, `hover`, `tick`, `pop`, `toggleOn`, `giftHover`, `play`, `pause`, `zoomOut`, `zoomIn`, `whooshSoft`, `planeFlyby`, `cloudWhoosh`, `cloudSoft`, `paperClose`, `takeoff`, `step`; **main** (sedang) = `paperDrop`, `airplaneChimes`, `hopUp`, `thud`, `boing`, `surprise`, `tvFlicker`, `tvOn`, `oops`; **key** (paling menonjol) = `start`, `reward`, `fanfare`; loop (`cabin`, `airport`, `wind`, `wheels`) = ambience, latar yang datar.

| Scene | SFX (urutan) |
| --- | --- |
| 01 Layar Pembuka | `hover`, `start` (klik Mulai Perjalanan) |
| 02 Kabin Pesawat | loop `cabin` (file); 02b: `zoomOut` (2,4 s); `airplaneChimes` (3,4 s, sekali per kunjungan, dua denting ~2,2 s); 02c: `whooshSoft` |
| 03 Pesawat di Langit | loop `wind`; 03a: `planeFlyby` (0,3 s); 03c: `cloudWhoosh`, lalu `cloudSoft` (+1,1 s) |
| 04 Peta Kado | loop `music`; 04a: `pop` (0,9 s dan 1,3 s); 04b: `giftHover`, `paperDrop` (file, saat kado diklik), `paperClose`; 04c: `reward` (Mendarat muncul), `whooshSoft` (Mulai Ulang); 04d: `takeoff`; 04e: `cloudWhoosh`, `cloudSoft` |
| 05 Bandara Bagasi | loop `airport` (file); 05a: `step` tiap 0,46 s; 05b: `hopUp`, `thud`, `boing`; 05c: `step`, loop `wheels` |
| 06 Gasing Melihat TV | loop `airport`; `pop` (tombol Kembali); 06a: `step`; 06b: `surprise`; 06c: `tvFlicker` (lalu `tvOn`); 06d: `zoomIn`; `pop` (bingkai TV) |
| 07 Video Ucapan | 07a: `play` / `pause`, `tick` (slider volume); 07b: `oops`; 07c: `click`, `cloudWhoosh`, `cloudSoft` |
| 08 Kartu Penutup | 08a: `fanfare`; 08b: `whooshSoft` (Putar ulang) |

Tombol suara (`hover`, `click`, `tick`, `toggleOn`) berlaku di semua scene. SFX `chimeAir`, `gift`, `check`, `squish`, `clip`, dan loop `belt` sudah dihapus (atas feedback); gerak koper dan Gasing tetap punya suara lewat `hopUp`, `thud`, `boing`, dan `step`.

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

Nama file aset lama mengikuti naskah desain, bukan nomor scene ini: `aset proyek/Scene 2.png` / `public/assets/images/scene2-bg.webp` = latar **Scene 03**, `scene3-bg.webp` = **Scene 04**, `scene5-bg.webp` = **Scene 06**, `scene6-tv.webp` = **Scene 07-08**. Nama file tidak diubah supaya skrip `tools/process-assets*.mjs` tetap cocok; konstanta kodenya (`IMG.langitBg`, `IMG.petaBg`, `IMG.ruangTvBg`, `IMG.tv`) sudah diberi nama deskriptif.
