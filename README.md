# Kado Ulang Tahun Interaktif untuk Prof. Yohanes Surya

Website cerita satu halaman (desktop, 16:9, di-scale agar muat) dengan 5 scene. Vite + React + TypeScript + Framer Motion.

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # hasil di dist/ (base './', bisa dibuka dari folder/host statis)
```

Hanya saat `npm run dev`: label nama scene aktif di pojok kiri bawah, dan lompat langsung ke scene lewat menu di label itu atau URL (mis. `?scene=05`, `?scene=04c`, `&all=1`). Daftar scene dan cara lompat: **[SCENES.md](SCENES.md)**.

## Yang perlu Anda ganti

| Apa | Lokasi |
| --- | --- |
| Isi surat (9 kado), nama provinsi, warna, posisi kado (%) | `src/data/gifts.ts` |
| Judul surat ("Untuk Prof. Yohanes Surya") | `LETTER_TITLE` di `src/data/gifts.ts` |
| Video ucapan | `public/assets/video/ucapan.mp4` (timpa file; jika belum ada tampil "Video segera hadir") |
| Audio (SFX, ambient, musik) | Campuran file (musik, ambience kabin/bandara, `paperDrop`, `airplaneChimes`) dan sintesis (`src/audio/synth.ts`). Tambah/normalisasi file: `npm run audio`; level: `src/audio/levels.json`. Lihat `AUDIO_CREDITS.md` |
| Teks penutup (Scene 08 - Kartu Penutup) | `src/scenes/Scene06GasingMelihatTv.tsx` (blok `end-card`) |

## Struktur

```
src/
  App.tsx                 state machine scene + transisi (openedGifts, hasCompletedOnce)
  config.ts               konstanta kanvas 1920x1080, path aset, ukuran sprite
  scenes/Scene01..06*.tsx   scene resmi bernomor (lihat SCENES.md); data/scenes.ts = daftar nama
  dev/                    alat debug (label scene, lompat scene), hanya mode dev
  components/             CloudTransition, LetterModal, GiftHotspot, GiftIcon, PrimaryButton,
                          GasingSprite, Suitcase, TvPlayer, AudioToggle, ...
  data/gifts.ts
public/assets/images|video|audio
tools/process-assets.mjs  memotong sprite + menambal latar dari "aset proyek/" (npm run assets)
```

Aset di `public/assets/images/` dihasilkan otomatis oleh `npm run assets` dari gambar di folder `aset proyek/`.

## Aset terpisah yang masih dibutuhkan (sekarang pakai pengganti sementara)

Semua penanda `TODO: ganti dengan sprite terpisah` ada di kode. Ganti dengan menimpa file di `public/assets/images/` (atau mengubah komponen terkait).

1. **Gasing, PNG transparan** (pose berjalan/berdiri, dan versi duduk untuk Scene 02). Sementara: dipotong otomatis dari Scene 05/06 (`gasing.png`, `gasing-s5.png`).
2. **Pesawat, PNG transparan**: Scene 03 (polos) dan Scene 04 (berisi Gasing). Sementara: dipotong otomatis (`scene2-plane.png`, `scene3-plane.png`).
3. **Ikon kado, PNG/SVG** (9 warna, idealnya ada versi terbuka). Sementara: SVG buatan sendiri di `src/components/GiftIcon.tsx`; kado di gambar peta dihapus dari latar.
4. **Koper**, sprite sederhana. Sementara: SVG di `src/components/Suitcase.tsx`.
5. **Video ucapan** `ucapan.mp4` dan **musik** `bgm.mp3`.
6. Opsional: **layer penumpang** Scene 02 (kepala, tangan, laptop, buku). Sementara: gerak mikro memakai salinan area gambar dengan tepi memudar (`Region` di `Scene02KabinPesawat.tsx`).
7. Latar bersih tanpa karakter untuk Scene 04/05/06. Sementara: hasil tambal otomatis; di Scene 05/06 masih terlihat sedikit buram di bekas posisi Gasing.

## Catatan teknis

- Animasi hanya memakai `transform`/`opacity`; semua gambar di-preload di layar loading bertema gasing (mainan gasing).
- `prefers-reduced-motion`: loop dimatikan, zoom besar dan transisi awan diganti fade singkat.
- Scene 02 memakai gambar kabin yang diperpanjang ke 16:9 (pita atas/bawah dibuat otomatis); Scene 05/06 adalah panorama yang digeser kameranya.
- Audio lewat satu pengelola (`src/audio/audio.ts`): terbuka setelah klik "Mulai Perjalanan" (aturan autoplay), tombol mute dan panel volume (Efek/Suasana/Musik) di pojok kanan bawah, ambient diredam saat video ucapan diputar. Musik hanya di scene kado dan fade out saat Mendarat.
- SFX dibuat prosedural (`src/audio/synth.ts`) dan dipicu tepat pada keyframe lewat `seq.sfx()` di alur animasi, atau `data-sfx` pada tombol. Cara menambah SFX baru dan menimpa dengan file asli: `AUDIO_CREDITS.md`.
- Sprite kabin/kado/koper/maskot diproses dari `aset proyek/` oleh `npm run assets:v2` (`tools/process-assets-v2.mjs`).

## Cara membuka

Jangan klik dua kali `index.html` / `dist/index.html` (browser memblokir modul JS dari `file://`, halaman tampil kosong).
Gunakan salah satu:

- Klik dua kali **`jalankan.bat`** (Windows), atau
- `npm run dev` lalu buka http://localhost:5173 (server harus tetap berjalan), atau
- Setelah `npm run build`: `npm run preview` lalu buka alamat yang tampil, atau unggah isi `dist/` ke hosting statis.
