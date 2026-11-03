/**
 * Konfigurasi 9 kado di peta (Scene Kado) beserta isi suratnya.
 *
 * - x / y   : posisi pusat kado dalam PERSEN terhadap gambar peta (0-100), tetap presisi saat resize.
 * - sprite  : nomor kado pada Giftbox1.png (tertutup) / Giftbox2.png (terbuka), baris demi baris dari kiri ke kanan:
 *             0 kuning, 1 biru, 2 ungu, 3 pink, 4 cokelat, 5 merah, 6 biru keunguan, 7 abu-abu, 8 cyan.
 *             (4, 5, 7 berasal dari "updated giftbox.png" / "updated giftbox2.png", diproses manual; menjalankan
 *             npm run assets:v2 akan menimpanya dengan kado lama dari Giftbox1/2.png.)
 *             (kado ke-10 di pojok kanan-bawah sheet sengaja tidak dipakai.)
 * - font    : kunci font pop-up surat (tiap divisi beda). Definisinya (nama keluarga Google Fonts + skala ukuran) ada di blok
 *             `.letter[data-font=...]` di src/index.css, dan fontnya dimuat lewat <link> di index.html.
 * - title   : judul pop-up surat (ucapan singkat, berbeda untuk tiap divisi).
 * - members : nama anggota divisi; tampil sebagai baris "Anggota: ..." di bawah surat.
 * - color   : warna kado/aksen (chip nama di surat, titik progres).
 * - envelope: (opsional) warna dasar amplop di atas pop-up surat. Bila kosong memakai `color`; amplop selalu
 *             ditampilkan versi pastel/pucat dari warna ini (atur kepucatannya di ENVELOPE_PASTEL, src/data/pastel.ts).
 * - letter  : teks surat. Baris kosong = pindah paragraf, satu baris baru = tetap satu paragraf (ditampilkan apa adanya).
 */
export interface Gift {
  id: string
  /** Nama divisi yang tampil di tooltip peta dan di chip pada surat */
  name: string
  /** Kunci font pop-up surat (lihat src/index.css, .letter[data-font]) */
  font: string
  /** Judul pop-up surat (ucapan singkat per divisi) */
  title: string
  /** Nama anggota divisi (urutan tampil di surat) */
  members: string[]
  x: number
  y: number
  sprite: number
  color: string
  /** warna dasar amplop (opsional, default = color) */
  envelope?: string
  letter: string
}

// Koordinat dihitung dari gambar Pulau.png 1672x941 (pusat kado): x% = px / 1672, y% = py / 941
const pct = (px: number, py: number) => ({ x: +((px / 1672) * 100).toFixed(2), y: +((py / 941) * 100).toFixed(2) })

export const GIFTS: Gift[] = [
  {
    id: 'sumatra',
    font: 'mali',
    title: 'Terus semangat menginspirasi & mencerdaskan generasi Indonesia!',
    name: 'Divisi Finance',
    members: ['Rechi', 'Claudia', 'Angely'],
    ...pct(350, 585),
    sprite: 0,
    color: '#ffb21a',
    letter: `Selamat ulang tahun, Prof. Yohanes Surya! 🎉

Semoga Prof. senantiasa diberikan kesehatan, kebahagiaan, dan kekuatan untuk terus berkarya serta menginspirasi banyak orang.

Terima kasih atas visi, dedikasi, dan semangat yang Prof. bangun dalam mengembangkan pendidikan Indonesia. Semoga setiap langkah dan cita-cita yang diperjuangkan dapat terus membawa manfaat yang lebih luas bagi banyak generasi.

Salam hangat dan doa terbaik dari kami, Divisi Finance. 🙏`,
  },
  {
    id: 'bali',
    font: 'gaegu',
    title: 'Live long and prosper!',
    name: 'Divisi Digital Learning',
    members: ['Ariyana', 'Believer', 'Ibnu', 'Oka'],
    ...pct(800, 748),
    sprite: 3,
    color: '#ff6f9c',
    letter: `Selamat ulang tahun, Prof. Yohanes!

Semoga Prof. Yohanes senantiasa diberikan kesehatan, kebahagiaan, dan semangat untuk terus menginspirasi dunia pendidikan Indonesia!

Kami tim Digital Learning berharap dapat terus bersama-sama menjadi bagian dari perjalanan Prof. Yohanes mewujudkan masa depan pendidikan Indonesia yang lebih baik 🙏🏼`,
  },
  {
    id: 'papua-barat',
    font: 'grandstander',
    title: 'Prof. Yohanes Surya, semoga senantiasa sehat, bahagia, & selalu diberkati!',
    name: 'Divisi Material Sosial Media',
    members: ['Clara', 'Dara'],
    ...pct(1275, 588),
    sprite: 7,
    color: '#7b8497',
    letter: `Kami dari tim Material mengucapkan selamat ulang tahun Prof. Yohanes.

Semoga panjang umur dan sehat selalu agar lebih banyak anak Indonesia bisa merasakan manfaat belajar dengan Metode Gasing. God bless always`,
  },
  {
    id: 'kalimantan',
    font: 'sniglet',
    title: 'Sehat dan bahagia selalu',
    name: 'Divisi Product',
    members: ['Gina', 'Arina', 'Icha', 'Muti', 'Isa'],
    ...pct(700, 568),
    sprite: 1,
    color: '#3d86ee',
    letter: `Selamat ulang tahun, Prof. Yohanes Surya.

Terima kasih atas inspirasi dan semangat Prof. dalam menghadirkan pendidikan yang lebih bermakna bagi anak-anak Indonesia. Semoga Prof. senantiasa diberikan kesehatan, kebahagiaan, kekuatan, dan kebijaksanaan untuk terus berkarya serta menginspirasi lebih banyak generasi.

Semoga setiap langkah, perjuangan, dan niat baik serta tulus Prof. dalam memajukan pendidikan senantiasa diberkahi dan membawa banyak manfaat bagi banyak orang.

Dengan penuh rasa hormat dan doa terbaik,
Tim Product Gasing Academy`,
  },
  {
    id: 'jawa',
    font: 'baloo',
    title: 'Thank you for being such a wonderful blessing to us',
    name: 'Divisi Outreach & Partnership',
    members: ['Maya', 'Ajeng', 'Johanes', 'Indra'],
    ...pct(610, 715),
    sprite: 2,
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
    font: 'kalam',
    title: 'Tuhan Yesus beserta selalu di setiap langkah Prof - Amsal 3:5',
    name: 'Divisi HR',
    members: ['Melisa', 'Felicia'],
    ...pct(880, 592),
    sprite: 4,
    color: '#b9702f',
    letter: `Selamat Ulang Tahun, Profesor Yohanes Surya! ❤️

Terima kasih telah menyalakan harapan dan membuka jalan bagi anak-anak Indonesia untuk percaya pada potensi diri mereka

Semoga semakin banyak mimpi yang terwujud, semakin banyak masa depan yang berubah, dan semakin banyak generasi yang tumbuh berani karena perjuangan Profesor

Semoga semangat Profesor terus hidup dalam setiap anak yang berani bermimpi dan percaya bahwa dirinya bisa✨

Dengan doa dan rasa hormat,
Melisa & Felicia HR Gasing Academy`,
  },
  {
    id: 'maluku',
    font: 'comic-neue',
    title: 'Teruslah menjadi inspirasi dan terang bagi Indonesia',
    name: 'Divisi Formal Education & Talent Development',
    members: ['Hana', 'Ekklesia', 'Mega', 'Fera', 'Julfikri'],
    ...pct(1100, 628),
    sprite: 5,
    color: '#e63946',
    letter: `Selamat ulang tahun, Prof. Yohanes Surya!

Kiranya Prof. senantiasa diberikan kesehatan, umur panjang, sukacita, dan kekuatan dalam menjalankan setiap panggilan dan karya yang Tuhan percayakan.

Terima kasih, Prof., atas dedikasi dan perjuangan Prof. dalam menghadirkan cara belajar matematika yang lebih mudah, menyenangkan, dan bermakna bagi anak-anak Indonesia. Semoga melalui metode Gasing, semakin banyak anak yang bukan hanya mampu memahami matematika, tetapi juga tumbuh rasa percaya diri dan kecintaannya terhadap ilmu pengetahuan.

Kiranya visi besar Prof. untuk memajukan pendidikan Indonesia terus bertumbuh, menjangkau lebih banyak anak hingga ke pelosok negeri, dan melahirkan generasi Indonesia yang cerdas serta membawa dampak bagi bangsa.

Tuhan senantiasa menyertai setiap langkah Prof., serta memberikan hikmat dan kekuatan untuk terus menjadi inspirasi bagi banyak orang.`,
  },
  {
    id: 'papua',
    font: 'fredoka',
    title: 'Sukses selalu dalam misi mencerdaskan anak bangsa Indonesia',
    name: 'Divisi Operasional',
    members: ['Valen', 'Nia', 'Vefy', 'Safira', 'Ridho'],
    ...pct(1430, 685),
    sprite: 8,
    color: '#2cc4dc',
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
  {
    id: 'material-kurikulum',
    font: 'atma',
    title: 'Kasih dan penyertaan Tuhan senantiasa menaungi setiap langkah Prof',
    name: 'Divisi Material Kurikulum',
    members: ['Asrida', 'John', 'Yoani', 'Joni'],
    // pulau kecil di selatan (deretan Nusa Tenggara), dijaga >=145 px (gambar peta) dari kado lain agar nyaman diklik
    ...pct(1010, 748),
    sprite: 6,
    color: '#6b6bf0',
    letter: `Selamat Ulang Tahun, Prof. Yohanes Surya.

Di hari istimewa ini, kami dari Divisi Material Kurikulum GASING ingin menyampaikan rasa syukur dan terima kasih karena telah menjadi bagian dari perjalanan yang Prof. bangun.

Dari Prof., kami belajar bahwa pendidikan bukan sekadar tentang menyampaikan ilmu, tetapi tentang menemukan potensi, menumbuhkan keyakinan, dan membuka jalan bagi setiap anak untuk percaya bahwa dirinya mampu.

Prof. mengajarkan kami untuk bermimpi lebih besar, melangkah lebih jauh, dan percaya bahwa ilmu akan menemukan makna sejatinya ketika menjadi manfaat bagi sesama.

Menjadi bagian dari keluarga besar GASING adalah anugerah bagi kami. Di sini, kami tidak hanya belajar tentang matematika, tetapi juga tentang ketulusan, pengabdian, dan arti sebuah perjuangan. Kami percaya, setiap ilmu dan nilai yang Prof. tanamkan akan terus hidup, tumbuh, dan diteruskan melalui banyak tangan dan generasi.

Terima kasih, Prof., telah menyalakan cahaya yang tak hanya menerangi jalan, tetapi juga mengajarkan kami untuk menjadi cahaya bagi orang lain.

Di usia yang baru ini, semoga kesehatan, kebahagiaan, dan keberkahan senantiasa menyertai setiap langkah Prof. Semoga semangat dan mimpi besar yang Prof. perjuangkan terus menemukan jalannya, menjangkau lebih banyak anak, dan menumbuhkan harapan bagi masa depan Indonesia.

Selamat ulang tahun, Prof.

Teruslah menjadi inspirasi, sebab ilmu mungkin diwariskan melalui kata-kata, tetapi keteladanan akan hidup jauh melampaui usia.

Dengan penuh hormat, kagum, dan cinta,
Divisi Material Kurikulum GASING`,
  },
]

/**
 * Posisi tombol "Mendarat" berbentuk ikon pada ronde ke-2: ujung barat Pulau Jawa (Jawa Barat), di area Divisi
 * Outreach & Partnership. Persen terhadap gambar peta (Pulau.png 1672x941), sama seperti posisi kado.
 */
export const LAND_ICON_POS = pct(490, 722)

