/**
 * Konfigurasi 8 kado di peta (Scene Kado) beserta isi suratnya.
 *
 * - x / y   : posisi pusat kado dalam PERSEN terhadap gambar peta (0-100), tetap presisi saat resize.
 * - sprite  : nomor kado pada Giftbox1.png (tertutup) / Giftbox2.png (terbuka), urutan kiri-ke-kanan, atas-ke-bawah:
 *             0 kuning, 1 oranye, 2 biru, 3 ungu, 4 pink, 5 hijau, 6 kuning tua, 7 merah-oranye, 8 biru muda.
 * - color   : warna aksen (chip nama di surat, titik progres).
 * - letter  : teks surat. Baris kosong = pindah paragraf, satu baris baru = tetap satu paragraf (ditampilkan apa adanya).
 */
export interface Gift {
  id: string
  /** Nama pulau/provinsi yang tampil di tooltip dan di surat */
  name: string
  x: number
  y: number
  sprite: number
  color: string
  letter: string
}

// Koordinat dihitung dari gambar Pulau.png 1672x941 (pusat kado): x% = px / 1672, y% = py / 941
const pct = (px: number, py: number) => ({ x: +((px / 1672) * 100).toFixed(2), y: +((py / 941) * 100).toFixed(2) })

export const GIFTS: Gift[] = [
  {
    id: 'sumatra',
    name: 'Sumatra',
    ...pct(350, 585),
    sprite: 1,
    color: '#f59e2d',
    letter: `Selamat ulang tahun, Prof. Yohanes Surya! 🎉

Semoga Prof. senantiasa diberikan kesehatan, kebahagiaan, dan kekuatan untuk terus berkarya serta menginspirasi banyak orang.

Terima kasih atas visi, dedikasi, dan semangat yang Prof. bangun dalam mengembangkan pendidikan Indonesia. Semoga setiap langkah dan cita-cita yang diperjuangkan dapat terus membawa manfaat yang lebih luas bagi banyak generasi.

Salam hangat dan doa terbaik dari kami, Divisi Finance. 🙏`,
  },
  {
    id: 'bali',
    name: 'Bali',
    ...pct(800, 748),
    sprite: 4,
    color: '#ee4d8f',
    letter: `Selamat ulang tahun, Prof. Yohanes!

Semoga Prof. Yohanes senantiasa diberikan kesehatan, kebahagiaan, dan semangat untuk terus menginspirasi dunia pendidikan Indonesia!

Kami tim Digital Learning berharap dapat terus bersama-sama menjadi bagian dari perjalanan Prof. Yohanes mewujudkan masa depan pendidikan Indonesia yang lebih baik 🙏🏼`,
  },
  {
    id: 'papua-barat',
    name: 'Papua Barat',
    ...pct(1200, 588),
    sprite: 7,
    color: '#e5484d',
    letter: `Kami dari tim Material mengucapkan selamat ulang tahun Prof. Yohanes.

Semoga panjang umur dan sehat selalu agar lebih banyak anak Indonesia bisa merasakan manfaat belajar dengan Metode Gasing. God bless always`,
  },
  {
    id: 'kalimantan',
    name: 'Kalimantan',
    ...pct(700, 568),
    sprite: 2,
    color: '#3d86ee',
    letter: `Selamat ulang tahun, Prof. Yohanes Surya.

Terima kasih atas inspirasi dan semangat Prof. dalam menghadirkan pendidikan yang lebih bermakna bagi anak-anak Indonesia. Semoga Prof. senantiasa diberikan kesehatan, kebahagiaan, kekuatan, dan kebijaksanaan untuk terus berkarya serta menginspirasi lebih banyak generasi.

Semoga setiap langkah, perjuangan, dan niat baik serta tulus Prof. dalam memajukan pendidikan senantiasa diberkahi dan membawa banyak manfaat bagi banyak orang.

Dengan penuh rasa hormat dan doa terbaik,
Tim Product Gasing Academy`,
  },
  {
    id: 'jawa',
    name: 'Pulau Jawa',
    ...pct(610, 715),
    sprite: 3,
    color: '#a45ce0',
    letter: `Happy Birthday, Prof. Yohanes Surya!

Satu keyakinan dapat mengubah cara seorang anak memandang dirinya. Satu kesempatan dapat membuka jalan menuju masa depan yang sebelumnya tak pernah ia bayangkan.

Terima kasih Pak Yo, telah menanamkan keyakinan bahwa setiap anak punya potensi untuk berkembang, dan menginspirasi kami untuk terus membawa keyakinan itu menjadi nyata. Melalui setiap kolaborasi dan kesempatan yang kami bangun bersama para mitra, semoga semakin banyak anak yang bukan hanya mendapat kesempatan untuk belajar, tetapi juga mulai percaya pada kemampuan dirinya sendiri.

Semoga Pak Yo selalu sehat dan bahagia, serta terus menemukan semangat dalam setiap karya dan perjalanan untuk menumbuhkan lebih banyak keyakinan di hati anak-anak Indonesia.

More possibilities. More believing. More children saying, “Aku bisa!”

With gratitude and our very best wishes,
Maya, Ajeng, Jo
Outreach and Partnership (Advance)
Gasing Academy
-06112026-`,
  },
  {
    id: 'sulawesi',
    name: 'Sulawesi',
    ...pct(880, 618),
    sprite: 5,
    color: '#41b85c',
    letter: `Selamat Ulang Tahun, Profesor Yohanes Surya! ❤️

Terima kasih telah menyalakan harapan dan membuka jalan bagi anak-anak Indonesia untuk percaya pada potensi diri mereka

Semoga semakin banyak mimpi yang terwujud, semakin banyak masa depan yang berubah, dan semakin banyak generasi yang tumbuh berani karena perjuangan Profesor

Semoga semangat Profesor terus hidup dalam setiap anak yang berani bermimpi dan percaya bahwa dirinya bisa✨

Dengan doa dan rasa hormat,
Melisa & Felicia HR Gasing Academy`,
  },
  {
    id: 'maluku',
    name: 'Maluku',
    ...pct(1100, 628),
    sprite: 0,
    color: '#f6bd2a',
    letter: `Selamat ulang tahun, Prof. Yohanes Surya!

Kiranya Prof. senantiasa diberikan kesehatan, umur panjang, sukacita, dan kekuatan dalam menjalankan setiap panggilan dan karya yang Tuhan percayakan.

Terima kasih, Prof., atas dedikasi dan perjuangan Prof. dalam menghadirkan cara belajar matematika yang lebih mudah, menyenangkan, dan bermakna bagi anak-anak Indonesia. Semoga melalui metode Gasing, semakin banyak anak yang bukan hanya mampu memahami matematika, tetapi juga tumbuh rasa percaya diri dan kecintaannya terhadap ilmu pengetahuan.

Kiranya visi besar Prof. untuk memajukan pendidikan Indonesia terus bertumbuh, menjangkau lebih banyak anak hingga ke pelosok negeri, dan melahirkan generasi Indonesia yang cerdas serta membawa dampak bagi bangsa.

Tuhan senantiasa menyertai setiap langkah Prof., serta memberikan hikmat dan kekuatan untuk terus menjadi inspirasi bagi banyak orang.`,
  },
  {
    id: 'papua',
    name: 'Papua',
    ...pct(1430, 685),
    sprite: 8,
    color: '#4fc0f0',
    letter: `Selamat Ulang Tahun ke-63, Prof. Yohanes Surya! 🎉🎂

Dengan penuh rasa hormat dan syukur, kami Tim Operasional Gasing Academy mengucapkan selamat ulang tahun kepada Prof. Yohanes Surya.

Terima kasih, Prof, karena telah menghadirkan Metode Gasing (Gampang, Asyik, dan Menyenangkan), sebuah inovasi yang bukan hanya mengubah cara anak-anak Indonesia belajar matematika, tetapi juga membuka mata banyak orang bahwa setiap anak memiliki potensi untuk menjadi cerdas ketika diberikan metode dan kesempatan yang tepat.

Bagi kami, menjadi bagian dari Gasing Academy bukan sekadar tentang menjalankan program dan menyelesaikan pekerjaan di balik layar. Lebih dari itu, kami merasa bangga dapat menjadi bagian dari sebuah gerakan besar yang membawa harapan, memperluas kesempatan belajar, dan mencerdaskan anak-anak Indonesia hingga ke pelosok negeri. Semua ini menjadi pengingat bahwa di balik setiap program yang kami dukung, ada cita-cita besar yang Prof perjuangkan: memastikan bahwa kecerdasan bukanlah hak istimewa segelintir anak, melainkan potensi yang dapat tumbuh dalam diri setiap anak Indonesia.

Ketekunan, keberanian untuk berinovasi, serta keyakinan Prof terhadap kemampuan anak-anak Indonesia menjadi inspirasi bagi kami untuk terus belajar, bertumbuh, dan memberikan kontribusi terbaik. Terima kasih telah menunjukkan bahwa pendidikan dapat menjadi jalan untuk mengubah masa depan, dan bahwa keterbatasan bukanlah alasan untuk berhenti bermimpi.

Di usia ke-63 ini, kami mendoakan semoga Prof senantiasa diberikan kesehatan, kebahagiaan, umur panjang, serta semangat yang terus menyala untuk melahirkan lebih banyak inovasi dan terobosan di dunia pendidikan. Semoga semakin banyak anak Indonesia yang tumbuh menjadi generasi cerdas, percaya diri, berkarakter, dan mampu membawa perubahan bagi bangsa. Semoga semakin luas pula jangkauan manfaat Metode Gasing, sehingga semakin banyak anak di berbagai penjuru negeri yang merasakan kesempatan untuk belajar dengan cara yang menyenangkan dan menemukan potensi terbaik dalam dirinya.

Selamat bertambah usia, Prof Yohanes Surya!

Terus menginspirasi, terus berinovasi, dan terus mencerdaskan Indonesia, Prof! 🇮🇩✨
Dengan hormat dan rasa terima kasih,

Tim Operasional Gasing Academy`,
  },
]

/** Judul surat (tetap sama untuk semua kado) */
export const LETTER_TITLE = 'Untuk Prof. Yohanes Surya'
