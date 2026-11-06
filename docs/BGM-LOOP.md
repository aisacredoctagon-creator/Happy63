# Loop BGM yang mulus (Coba Soal Gasing dan Orang Jenius Suka Berhitung)

Analisis file `2b. Coba Soal Gasing Loop.mp3` dan `3b. Orang Jenius Suka Berhitung Loop.mp3` (ffmpeg + skrip Node, hasil dapat diulang) dan teknik pemutarannya.

## Hasil analisis

| | Coba Soal Gasing | Orang Jenius |
| --- | --- | --- |
| Format | MP3 CBR 320 kbps, 48 kHz, stereo, **tanpa** header Xing/LAME dan tanpa ID3 | sama |
| Durasi file | 83,472 s (3478 frame x 1152) | 106,200 s (4425 frame) |
| Senyap di awal | ~0,59 s (hampir digital senyap, -94 dB), lalu musik langsung masuk | ~0,55 s |
| Ekor di akhir | musik "kering" berhenti ~78,7 s, lalu **ekor reverb memudar ~4,8 s** (-30 dB sampai -148 dB) | berhenti ~101,2 s, ekor ~5,0 s |
| Tempo | 110 BPM | 100 BPM |
| Panjang file dalam ketukan | **153,0** ketukan = 1 + 36 x 4 + 8 | **177,0** ketukan = 1 + 42 x 4 + 8 |

Kecocokan angka bulat (153 dan 177 ketukan) menunjukkan struktur file: **1 ketukan senyap + N birama musik + 2 birama ekor reverb** (N = 36 dan 42, birama 4/4). Itu ekspor loop dari DAW: ekor reverb sengaja disertakan karena harus **menimpa awal putaran berikutnya**.

Akibatnya memutar file apa adanya (`audio.loop = true`, atau memotong senyapnya lalu loop) **tidak mulus**: ~5 detik peluruhan ekor ditambah ~0,5 detik senyap menjadi jeda di tiap putaran. Simulasi (ekor ditimpa pada awal putaran ke-2, periode N birama) menghasilkan level kontinu: tidak ada lubang dan tidak ada lonjakan puncak (puncak sampel di sambungan 0,70 vs 0,76 di badan lagu).

Celah bawaan MP3 (encoder delay/padding): file ini tidak punya header LAME, jadi decoder tidak bisa mengompensasinya (sekitar 1105 sampel = 23 ms). Itu **tidak berpengaruh** pada teknik di bawah, karena yang dipakai hanya jarak antar awal salinan (periode), bukan posisi absolut di dalam file. Hasil konversi AAC cocok dengan MP3 sumber (selisih 3 ms, korelasi 0,999) dan durasinya tetap (83,48 s dan 106,21 s).

## Teknik pemutaran (`tailLoop` di `src/audio/bgm.ts`, `src/audio/bgmPlayer.ts`)

**Overlap ekor:** salinan berikutnya dimulai tiap `period` detik (= N birama: 78,545 s untuk Coba Soal Gasing, 100,8 s untuk Orang Jenius) pada gain penuh; salinan sebelumnya dibiarkan memainkan ekor reverb-nya sampai habis (lalu dilepas). Tanpa fade dan tanpa crossfade, jadi tidak ada dua lagu menumpuk dengan level ganda: yang tumpang tindih hanya ekor reverb yang sangat pelan di bawah awal musik baru.

- Pemutar tetap berbasis `<audio>` (streaming), bukan buffer Web Audio utuh: decode 83-106 detik stereo = 32-41 MB PCM, dan di iPhone memori sudah ketat (alasan BGM dialihkan ke streaming).
- Pemicu memakai waktu `currentTime` salinan terbaru, dikurangi jeda `play()` yang diukur dan dihaluskan. Pada uji di browser, salinan baru dimulai 30-32 ms sebelum titik periode (pada jeda `play()` kira-kira sama, jadi bunyi mulai di titik periode). Selisih beberapa milidetik tidak terdengar karena yang tumpang tindih adalah ekor reverb, bukan ketukan.
- Pemutaran pertama melompati ketukan senyap di awal (`startAt` 0,45 s) supaya musik langsung terdengar; salinan berikutnya mulai dari 0 agar kisi ketukan terjaga.
- Dijeda/dilanjutkan bersama tab (visibility), dan ganti lagu tetap memakai fade manager (lagu lama memudar dan dilepas, satu lagu pada satu waktu).

## Memproses ulang / menambah loop sejenis

1. Taruh `...Loop.mp3` di `aset proyek/`, tambahkan item di `scripts/audio-sources.json` dengan `"trim": "none"` (**jangan** potong senyap/ekor), jalankan `npm run audio`.
2. Tambahkan entri di `BGM_TRACKS` dengan `tailLoop: { period: N x 4 x 60 / BPM, startAt }` (cek: durasi file = 1 ketukan + period + 2 birama).
