import { db } from "./index.js";
import * as schema from "./schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { generateCuid } from "./cuid.js";

dotenv.config();

export async function seedSubthemeDummies() {
  console.log("🌱 Injecting 1 dummy pending submission per sub-theme...");

  const saltRounds = 10;
  const defaultPassword = await bcrypt.hash("Password123!", saltRounds);

  // 1. Fetch available categories
  const categories = await db.select().from(schema.Category);
  if (categories.length === 0) {
    throw new Error("No categories found. Please run category seeds first.");
  }

  const findCat = (slugOrName) => {
    const q = slugOrName.toLowerCase();
    return (
      categories.find(
        (c) =>
          c.category_id === slugOrName ||
          c.slug?.toLowerCase() === q ||
          c.name?.toLowerCase() === q
      ) ||
      categories.find(
        (c) =>
          c.slug?.toLowerCase().includes(q) ||
          c.name?.toLowerCase().includes(q)
      ) ||
      categories[0]
    );
  };

  const catUIA = findCat("UIA") || findCat("ui/ux");
  const catUIDesign = findCat("cat-uiux-2026") || findCat("ui/ux design");
  const catWIA = findCat("WIA") || findCat("web in action");
  const catWebDev = findCat("cat-webdev-2026") || findCat("web development");

  const subThemeDummies = [
    // ==========================================
    // UI/UX IN ACTION (UIA) - 5 Subthemes
    // ==========================================
    {
      category: catUIA,
      userEmail: "peserta.smartmobility.uia@mia2026.com",
      userName: "Bambang Wijaya",
      nim: "2410513001",
      teamName: "Tim NaviCity UIA",
      teamMembers: JSON.stringify(["Bambang Wijaya (Ketua)", "Aditya Surya (UI)", "Kevin Tanaka (UX)"]),
      submission: {
        project_name: "NaviCity - Solusi Cerdas Mobilitas Komuter Perkotaan",
        sub_theme: "Smart Mobility",
        description: "Desain UI/UX aplikasi navigasi transportasi publik terintegrasi real-time dengan prediksi kepadatan armada dan rekomendasi rute multi-moda ramah pejalan kaki.",
        flow_application: "1. Pengguna menentukan titik keberangkatan dan tujuan komuter.\n2. Sistem menyajikan rute multi-moda tercepat dengan estimasi kepadatan gerbong MRT/KRL.\n3. Notifikasi haptik aktif 1 stasiun sebelum titik turun.\n4. Pembayaran tiket terpadu menggunakan satu kode QR dinamis.",
        thumbnail_url: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80",
        links: [
          { link_type: "YOUTUBE", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Video Prototype NaviCity" },
          { link_type: "PROPOSAL", url: "https://docs.google.com/document/d/dummy-navicity/edit", description: "Design Document & Research Report" },
          { link_type: "PRESENTATION", url: "https://www.canva.com/design/dummy-navicity/view", description: "Slide Presentasi Finalis" },
          { link_type: "ORIGINALITY_STATEMENT", url: "https://drive.google.com/file/d/dummy-navicity-ori/view", description: "Surat Orisinalitas Bermaterai" },
          { link_type: "FIGMA", url: "https://www.figma.com/design/dummy-navicity/", description: "Figma UI Kit & Design System" },
          { link_type: "FIGMA_PROTOTYPE", url: "https://www.figma.com/proto/dummy-navicity-proto/", description: "Interactive Mobile Prototype" },
        ],
      },
    },
    {
      category: catUIA,
      userEmail: "peserta.inclusivelearning.uia@mia2026.com",
      userName: "Nadia Amalia",
      nim: "2410513002",
      teamName: "Tim AksaraCeria UIA",
      teamMembers: JSON.stringify(["Nadia Amalia (Lead UX)", "Salsabila Ramadhani (UI Designer)"]),
      submission: {
        project_name: "AksaraCeria - Platform Pembelajaran Interaktif Siswa Berkebutuhan Khusus",
        sub_theme: "Inclusive Learning",
        description: "Konsep desain antarmuka belajar ramah disabilitas kognitif dengan mode kontras adaptif, micro-rewards gamifikasi, dan asisten visual ramah anak.",
        flow_application: "1. Profiling gaya belajar anak dengan kuis visual ramah anak.\n2. Modul materi disajikan dengan ilustrasi interaktif dan audio deskriptif.\n3. Anak menyelesaikan latihan dengan gesture sentuh sederhana tanpa batasan waktu ketat.\n4. Orang tua dan guru menerima laporan perkembangan adaptif mingguan.",
        thumbnail_url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80",
        links: [
          { link_type: "YOUTUBE", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Video Walkthrough AksaraCeria" },
          { link_type: "PROPOSAL", url: "https://docs.google.com/document/d/dummy-aksaraceria/edit", description: "Proposal Penelitian UX Inklusif" },
          { link_type: "PRESENTATION", url: "https://www.canva.com/design/dummy-aksaraceria/view", description: "Pitch Deck Kompetisi" },
          { link_type: "ORIGINALITY_STATEMENT", url: "https://drive.google.com/file/d/dummy-aksaraceria-ori/view", description: "Surat Keaslian Karya" },
          { link_type: "FIGMA", url: "https://www.figma.com/design/dummy-aksaraceria/", description: "Figma File Desain" },
        ],
      },
    },
    {
      category: catUIA,
      userEmail: "peserta.accessibletech.uia@mia2026.com",
      userName: "Rifqi Alamsyah",
      nim: "2410513003",
      teamName: "Tim NetraSense UIA",
      teamMembers: JSON.stringify(["Rifqi Alamsyah (Ketua)", "Haris Gunawan (Accessibility Specialist)"]),
      submission: {
        project_name: "NetraSense - Antarmuka Haptik & Audio Ramah Tunanetra",
        sub_theme: "Accessible Technology",
        description: "Perancangan pengalaman digital mobile inklusif berstandar WCAG 2.1 AAA dengan gesture navigasi layar sentuh berbasis getaran haptik dan panduan spasial audio.",
        flow_application: "1. Pengguna mengaktifkan mode NetraSense via pintasan ketuk ganda belakang ponsel.\n2. Seluruh elemen UI dialihkan ke umpan balik audio spasial dan pola getar haptik bervariasi.\n3. Navigasi menu didesain menggunakan gesture sapuan 4 kuadran sederhana.\n4. Kamera AI secara instan membacakan teks dokumen dan mendeteksi rintangan sekitar.",
        thumbnail_url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
        links: [
          { link_type: "YOUTUBE", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Video Demonstrasi Aksesibilitas" },
          { link_type: "PROPOSAL", url: "https://docs.google.com/document/d/dummy-netrasense/edit", description: "Dokumen Studi Aksesibilitas WCAG" },
          { link_type: "PRESENTATION", url: "https://www.canva.com/design/dummy-netrasense/view", description: "Slide Presentasi Finalis" },
          { link_type: "ORIGINALITY_STATEMENT", url: "https://drive.google.com/file/d/dummy-netrasense-ori/view", description: "Surat Orisinalitas NetraSense" },
          { link_type: "FIGMA", url: "https://www.figma.com/design/dummy-netrasense/", description: "Desain Sistem UI NetraSense" },
        ],
      },
    },
    {
      category: catUIA,
      userEmail: "peserta.sustainableenv.uia@mia2026.com",
      userName: "Tiara Maharani",
      nim: "2410513004",
      teamName: "Tim EcoCycle UIA",
      teamMembers: JSON.stringify(["Tiara Maharani (Ketua)", "Bayu Pamungkas (UX Researcher)"]),
      submission: {
        project_name: "EcoCycle - Ekosistem Pengelolaan Sampah & Daur Ulang Mandiri",
        sub_theme: "Sustainable Environment",
        description: "Desain aplikasi pemilahan sampah daur ulang rumah tangga dengan sistem penjemputan cerdas, reward poin hijau, dan edukasi jejak karbon harian.",
        flow_application: "1. Warga memindai jenis sampah rumah tangga dengan AI scanner pemilah.\n2. Aplikasi memberikan panduan pengemasan dan menjadwalkan penjemputan oleh bank sampah.\n3. Berat sampah terverifikasi dikonversi menjadi poin belanja kebutuhan pokok.\n4. Dashboard menampilkan reduksi jejak karbon rumah tangga secara kumulatif.",
        thumbnail_url: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=1200&q=80",
        links: [
          { link_type: "YOUTUBE", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Video Pitch EcoCycle" },
          { link_type: "PROPOSAL", url: "https://docs.google.com/document/d/dummy-ecocycle/edit", description: "Proposal Desain Solusi Lingkungan" },
          { link_type: "PRESENTATION", url: "https://www.canva.com/design/dummy-ecocycle/view", description: "Deck Presentasi EcoCycle" },
          { link_type: "ORIGINALITY_STATEMENT", url: "https://drive.google.com/file/d/dummy-ecocycle-ori/view", description: "Surat Pernyataan Keaslian" },
          { link_type: "FIGMA", url: "https://www.figma.com/design/dummy-ecocycle/", description: "Figma Prototype & Design Tokens" },
        ],
      },
    },
    {
      category: catUIA,
      userEmail: "peserta.localbusiness.uia@mia2026.com",
      userName: "Danang Saputra",
      nim: "2410513005",
      teamName: "Tim PasarDigital UIA",
      teamMembers: JSON.stringify(["Danang Saputra (Ketua)", "Annisa Tri (UI Designer)", "Yoga Pratama (Researcher)"]),
      submission: {
        project_name: "PasarDigital - Pemberdayaan Digitalisasi UMKM Tradisional",
        sub_theme: "Local Business Empowerment",
        description: "Desain sistem inventaris dan katalog digital ramah pedagang pasar tradisional dengan interaksi berbasis perintah suara dan transaksi QRIS instan.",
        flow_application: "1. Pedagang mendaftarkan komoditas harian cukup dengan berbicara ke mikrofon aplikasi.\n2. Sistem AI mengonversi ucapan menjadi entri stok harga pasar dan foto katalog otomatis.\n3. Pembeli sekitar memesan secara online dan pesanan disiapkan tanpa antrean.\n4. Laporan omzet dan laba harian disajikan dalam bentuk grafik sederhana yang mudah dipahami.",
        thumbnail_url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
        links: [
          { link_type: "YOUTUBE", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Video Walkthrough PasarDigital" },
          { link_type: "PROPOSAL", url: "https://docs.google.com/document/d/dummy-pasardigital/edit", description: "Dokumen Riset Pengguna UMKM" },
          { link_type: "PRESENTATION", url: "https://www.canva.com/design/dummy-pasardigital/view", description: "Pitch Deck Inovasi UMKM" },
          { link_type: "ORIGINALITY_STATEMENT", url: "https://drive.google.com/file/d/dummy-pasardigital-ori/view", description: "Surat Orisinalitas Bermaterai" },
          { link_type: "FIGMA", url: "https://www.figma.com/design/dummy-pasardigital/", description: "Figma High Fidelity Prototype" },
        ],
      },
    },

    // ==========================================
    // UI/UX DESIGN COMPETITION (Legacy) - 5 Subthemes
    // ==========================================
    {
      category: catUIDesign,
      userEmail: "peserta.smartmobility.design@mia2026.com",
      userName: "Galih Prasetyo",
      nim: "2410513006",
      teamName: "Tim GoCommute Design",
      teamMembers: JSON.stringify(["Galih Prasetyo (Ketua)", "Fajar Setiawan (UI/UX)"]),
      submission: {
        project_name: "GoCommute - Desain Seamless Transit Terintegrasi",
        sub_theme: "Smart Mobility",
        description: "Antarmuka terpadu perencanaan perjalanan antarkota dengan sinkronisasi jadwal kereta komuter, bus rapid transit, dan ride-hailing mikro.",
        flow_application: "1. Pengguna mencari rute antarkota terpadu.\n2. Rekomendasi waktu keberangkatan optimal menghindari bottleneck jam sibuk.\n3. Notifikasi gate stasiun dan nomor peron otomatis tampil di layar kunci.\n4. Integrasi e-wallet untuk pembayaran tiket multi-operator dalam satu klik.",
        thumbnail_url: "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?auto=format&fit=crop&w=1200&q=80",
        links: [
          { link_type: "YOUTUBE", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Video Demo GoCommute" },
          { link_type: "PROPOSAL", url: "https://docs.google.com/document/d/dummy-gocommute/edit", description: "Proposal Desain GoCommute" },
          { link_type: "FIGMA", url: "https://www.figma.com/design/dummy-gocommute/", description: "Figma Prototype Link" },
        ],
      },
    },
    {
      category: catUIDesign,
      userEmail: "peserta.inclusivelearning.design@mia2026.com",
      userName: "Zulfa Azzahra",
      nim: "2410513007",
      teamName: "Tim EduInklusi Design",
      teamMembers: JSON.stringify(["Zulfa Azzahra (Lead)", "Kurniawan Dwi (UX)"]),
      submission: {
        project_name: "EduInklusi - UI/UX Ruang Belajar Ramah Neurodivergen",
        sub_theme: "Inclusive Learning",
        description: "Platform digital pembelajaran adaptif bagi pelajar ADHD dan disleksia dengan mode font OpenDyslexic, bionic reading, dan fokus bebas distraksi.",
        flow_application: "1. Pengguna memilih profil kenyamanan baca (Dyslexia-friendly, ADHD focus mode).\n2. Teks pelajaran dipecah ke chunk ringkas dengan visual cues warna penanda.\n3. Audio narasi tersinkronisasi kata-per-kata saat dibacakan.\n4. Evaluasi pemahaman menggunakan kartu interaktif non-intimidatif.",
        thumbnail_url: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80",
        links: [
          { link_type: "YOUTUBE", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Video Walkthrough EduInklusi" },
          { link_type: "PROPOSAL", url: "https://docs.google.com/document/d/dummy-eduinklusi/edit", description: "Dokumen Riset Neurodivergen" },
          { link_type: "FIGMA", url: "https://www.figma.com/design/dummy-eduinklusi/", description: "Figma Design EduInklusi" },
        ],
      },
    },
    {
      category: catUIDesign,
      userEmail: "peserta.accessibletech.design@mia2026.com",
      userName: "Eko Wahyudi",
      nim: "2410513008",
      teamName: "Tim VoiceAssist Design",
      teamMembers: JSON.stringify(["Eko Wahyudi (Ketua)", "Larasati Dewi (Designer)"]),
      submission: {
        project_name: "VoiceAssist - Antarmuka Suara & Haptik Lansia",
        sub_theme: "Accessible Technology",
        description: "Desain pengalaman digital khusus lansia untuk kemudahan transaksi perbankan dan kesehatan dengan tipografi super-legible dan interaksi suara bahasa daerah.",
        flow_application: "1. Lansia cukup menekan satu tombol besar untuk memulai perintah suara.\n2. Asisten memverifikasi instruksi dengan suara ramah dan konfirmasi tombol visual besar.\n3. Layar menyajikan teks kontras tinggi dengan panduan langkah demi langkah.\n4. Fitur tombol darurat langsung menghubungi kontak keluarga terdekat.",
        thumbnail_url: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=1200&q=80",
        links: [
          { link_type: "YOUTUBE", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Video Demo VoiceAssist" },
          { link_type: "PROPOSAL", url: "https://docs.google.com/document/d/dummy-voiceassist/edit", description: "Proposal Teknis Lansia" },
          { link_type: "FIGMA", url: "https://www.figma.com/design/dummy-voiceassist/", description: "Figma Prototype File" },
        ],
      },
    },
    {
      category: catUIDesign,
      userEmail: "peserta.sustainableenv.design@mia2026.com",
      userName: "Mira Santoso",
      nim: "2410513009",
      teamName: "Tim HijauBumi Design",
      teamMembers: JSON.stringify(["Mira Santoso (Ketua)", "Indra Kusuma (UX Designer)"]),
      submission: {
        project_name: "HijauBumi - Pelacak Jejak Karbon & Gaya Hidup Berkelanjutan",
        sub_theme: "Sustainable Environment",
        description: "Aplikasi pencatatan emisi karbon personal harian dengan tantangan komunitas ramah lingkungan dan sistem penanaman pohon virtual terverifikasi.",
        flow_application: "1. Pengguna memasukkan moda transportasi dan konsumsi energi harian.\n2. Algoritma menghitung total emisi karbon dan memberikan saran substitusi ramah lingkungan.\n3. Berpartisipasi dalam 'Green Challenge' untuk membuka bibit pohon digital.\n4. Setiap pohon digital yang matang dikonversi menjadi pohon riil bersama NGO mitra.",
        thumbnail_url: "https://images.unsplash.com/photo-1473081556163-2a17de81fc97?auto=format&fit=crop&w=1200&q=80",
        links: [
          { link_type: "YOUTUBE", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Video Pitch HijauBumi" },
          { link_type: "PROPOSAL", url: "https://docs.google.com/document/d/dummy-hijaubumi/edit", description: "Proposal Dampak Lingkungan" },
          { link_type: "FIGMA", url: "https://www.figma.com/design/dummy-hijaubumi/", description: "Desain Prototipe Figma" },
        ],
      },
    },
    {
      category: catUIDesign,
      userEmail: "peserta.localbusiness.design@mia2026.com",
      userName: "Bagas Wicaksono",
      nim: "2410513010",
      teamName: "Tim KriyaLokal Design",
      teamMembers: JSON.stringify(["Bagas Wicaksono (Ketua)", "Ratna Juwita (UI Designer)"]),
      submission: {
        project_name: "KriyaLokal - Etalase Virtual & Onboarding Pengrajin Daerah",
        sub_theme: "Local Business Empowerment",
        description: "Platform kurasi dan marketplace pengrajin lokal nusantara dengan visualisasi 3D AR produk kriya serta proses pembuatan interaktif.",
        flow_application: "1. Pengrajin mengunggah foto produk dan cerita filosofi pembuatan karya kriya.\n2. Pembeli dapat memproyeksikan produk ke ruangan nyata via Augmented Reality (AR).\n3. Pembelian aman terhubung escrow dengan jaminan sertifikat keaslian buatan tangan.\n4. Dashboard pengrajin menampilkan statistik minat pasar domestik dan global.",
        thumbnail_url: "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1200&q=80",
        links: [
          { link_type: "YOUTUBE", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Video Demo KriyaLokal" },
          { link_type: "PROPOSAL", url: "https://docs.google.com/document/d/dummy-kriyalokal/edit", description: "Dokumen Studi Kasus Kriya" },
          { link_type: "FIGMA", url: "https://www.figma.com/design/dummy-kriyalokal/", description: "Figma Interactive Preview" },
        ],
      },
    },

    // ==========================================
    // WEB IN ACTION (WIA) - 4 Subthemes
    // ==========================================
    {
      category: catWIA,
      userEmail: "peserta.opengov.wia@mia2026.com",
      userName: "Rian Hidayat",
      nim: "2410513011",
      teamName: "Tim SatuAnggaran WIA",
      teamMembers: JSON.stringify(["Rian Hidayat (Ketua)", "Putra Utama (Frontend)", "Siti Nurhaliza (Backend)"]),
      submission: {
        project_name: "SatuAnggaran - Visualisasi Interaktif Transparansi APBD Daerah",
        sub_theme: "Open Government Data",
        description: "Platform web open government data untuk visualisasi real-time alokasi dan realisasi APBD per sektor dengan grafik dinamis dan ekspor dataset terbuka.",
        flow_application: "1. Warga memilih provinsi/kabupaten pada peta interaktif Indonesia.\n2. Dashboard menyajikan diagram alokasi dana pendidikan, kesehatan, dan infrastruktur.\n3. Fitur filter membandingkan target anggaran vs serapan riil kuartal berjalan.\n4. Peneliti dapat mengunduh dataset resmi dalam format CSV/JSON via REST API publik.",
        thumbnail_url: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80",
        links: [
          { link_type: "YOUTUBE", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Video Demo SatuAnggaran" },
          { link_type: "PROPOSAL", url: "https://docs.google.com/document/d/dummy-satuanggaran/edit", description: "Proposal Teknis & Arsitektur Data" },
          { link_type: "PRESENTATION", url: "https://www.canva.com/design/dummy-satuanggaran/view", description: "Pitch Deck WIA" },
          { link_type: "ORIGINALITY_STATEMENT", url: "https://drive.google.com/file/d/dummy-satuanggaran-ori/view", description: "Surat Orisinalitas Bermaterai" },
          { link_type: "GITHUB", url: "https://github.com/example/satu-anggaran-web", description: "GitHub Monorepo Next.js" },
          { link_type: "DEPLOYMENT", url: "https://satuanggaran.vercel.app", description: "Live Demo Web" },
        ],
      },
    },
    {
      category: catWIA,
      userEmail: "peserta.publicservice.wia@mia2026.com",
      userName: "Fanny Anggraini",
      nim: "2410513012",
      teamName: "Tim LacakLayanan WIA",
      teamMembers: JSON.stringify(["Fanny Anggraini (Ketua)", "Gilang Perdana (Fullstack)"]),
      submission: {
        project_name: "LacakLayanan - Sistem Tracking Progres Pelayanan & Perizinan Publik",
        sub_theme: "Public Service Tracking",
        description: "Aplikasi web tracking permohonan berkas dan perizinan layanan publik secara real-time dari registrasi, verifikasi instansi, hingga penerbitan dokumen.",
        flow_application: "1. Pemohon memasukkan nomor tiket berkas perizinan (IMB, KTP, Surat Usaha).\n2. Timeline visual menampilkan status posisi berkas, petugas verifikator, dan SLA sisa waktu.\n3. Notifikasi otomatis via email dan WhatsApp saat dokumen selesai diverifikasi.\n4. Unduh dokumen bertandatangan elektronik (BSrE) langsung dari portal.",
        thumbnail_url: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80",
        links: [
          { link_type: "YOUTUBE", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Video Showcase LacakLayanan" },
          { link_type: "PROPOSAL", url: "https://docs.google.com/document/d/dummy-lacaklayanan/edit", description: "Proposal Sistem Pelacakan Layanan" },
          { link_type: "GITHUB", url: "https://github.com/example/lacak-layanan-core", description: "Source Code GitHub" },
          { link_type: "DEPLOYMENT", url: "https://lacaklayanan.vercel.app", description: "Live Production URL" },
        ],
      },
    },
    {
      category: catWIA,
      userEmail: "peserta.civicreporting.wia@mia2026.com",
      userName: "Ikhsan Fauzi",
      nim: "2410513013",
      teamName: "Tim WargaPeduli WIA",
      teamMembers: JSON.stringify(["Ikhsan Fauzi (Ketua)", "Rizky Firmansyah (Backend)", "Melani Safitri (Frontend)"]),
      submission: {
        project_name: "WargaPeduli - Portal Pengaduan Infrastruktur Publik & Akuntabilitas",
        sub_theme: "Civic Reporting & Accountability",
        description: "Platform pelaporan kerusakan fasilitas umum dengan geolokasi presisi, voting prioritas keluhan warga, dan timeline tindak lanjut perbaikan instansi terkait.",
        flow_application: "1. Warga memotret kerusakan jalan atau lampu penerangan dan mengisi detail lokasi.\n2. Laporan dipetakan ke peta spasial publik dan diverifikasi oleh warga sekitar lewat upvote.\n3. Instansi dinas terkait menerima tiket prioritas dengan batas waktu respon 3x24 jam.\n4. Foto bukti perbaikan diunggah dinas dan dapat diverifikasi ulang oleh pelapor.",
        thumbnail_url: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80",
        links: [
          { link_type: "YOUTUBE", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Video Simulasi WargaPeduli" },
          { link_type: "PROPOSAL", url: "https://docs.google.com/document/d/dummy-wargapeduli/edit", description: "Dokumen Spesifikasi Teknis" },
          { link_type: "PRESENTATION", url: "https://www.canva.com/design/dummy-wargapeduli/view", description: "Slide Presentasi Finalis" },
          { link_type: "ORIGINALITY_STATEMENT", url: "https://drive.google.com/file/d/dummy-wargapeduli-ori/view", description: "Surat Orisinalitas Bermaterai" },
          { link_type: "GITHUB", url: "https://github.com/example/warga-peduli-app", description: "GitHub Web App" },
          { link_type: "DEPLOYMENT", url: "https://wargapeduli.org", description: "Live Web Demo" },
        ],
      },
    },
    {
      category: catWIA,
      userEmail: "peserta.decisionsupport.wia@mia2026.com",
      userName: "Teguh Santoso",
      nim: "2410513014",
      teamName: "Tim PetaKesejahteraan WIA",
      teamMembers: JSON.stringify(["Teguh Santoso (Ketua)", "Chandra Wijaya (Data Scientist)"]),
      submission: {
        project_name: "PetaKesejahteraan - Decision Support System Kualitas Hidup Warga",
        sub_theme: "Data-Driven Decision Support",
        description: "Portal analitik berbasis data publik untuk membantu pemangku kebijakan dan peneliti memetakan indeks kesejahteraan sosial serta fasilitas kesehatan per kecamatan.",
        flow_application: "1. Pengambil keputusan memilih parameter indeks (pendidikan, puskesmas, kemiskinan).\n2. Sistem menjalankan clustering k-means dan visualisasi heatmap wilayah rawan kesenjangan.\n3. Algoritma memberikan rekomendasi alokasi prioritas pembangunan puskesmas pembantu.\n4. Ekspor laporan ringkas eksekutif dalam format PDF dan infografis interaktif.",
        thumbnail_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
        links: [
          { link_type: "YOUTUBE", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Video Demo Analytics Dashboard" },
          { link_type: "PROPOSAL", url: "https://docs.google.com/document/d/dummy-petakesejahteraan/edit", description: "Proposal Teknis DSS" },
          { link_type: "GITHUB", url: "https://github.com/example/dss-kesejahteraan", description: "GitHub Next.js + Python API" },
          { link_type: "DEPLOYMENT", url: "https://peta-kesejahteraan.web.app", description: "Live DSS App" },
        ],
      },
    },

    // ==========================================
    // WEB DEVELOPMENT COMPETITION - 4 Subthemes
    // ==========================================
    {
      category: catWebDev,
      userEmail: "peserta.opengov.webdev@mia2026.com",
      userName: "Alif Nugroho",
      nim: "2410513015",
      teamName: "Tim DataPublik WebDev",
      teamMembers: JSON.stringify(["Alif Nugroho (Ketua)", "Doni Prasetya (Frontend)"]),
      submission: {
        project_name: "DataPublik.id - Portal Open Data Statistik & Sensus Terbuka",
        sub_theme: "Open Government Data",
        description: "Aplikasi portal statistik interaktif untuk eksplorasi data sensus ekonomi, demografi, dan iklim daerah dengan query builder ramah pemula.",
        flow_application: "1. Pengguna mencari indikator statistik makro ekonomi daerah.\n2. Query builder visual menghasilkan grafik perbandingan antardaerah secara dinamis.\n3. Fitur peramalan tren sederhana berbasis regresi linier deret waktu.\n4. Integrasi endpoint GraphQL untuk developer aplikasi pihak ketiga.",
        thumbnail_url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
        links: [
          { link_type: "YOUTUBE", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Video Demo DataPublik" },
          { link_type: "PROPOSAL", url: "https://docs.google.com/document/d/dummy-datapublik/edit", description: "Proposal DataPublik" },
          { link_type: "GITHUB", url: "https://github.com/example/datapublik-web", description: "Source Code GitHub" },
          { link_type: "DEPLOYMENT", url: "https://datapublik-id.vercel.app", description: "Live Demo" },
        ],
      },
    },
    {
      category: catWebDev,
      userEmail: "peserta.publicservice.webdev@mia2026.com",
      userName: "Karina Kusuma",
      nim: "2410513016",
      teamName: "Tim PantauBansos WebDev",
      teamMembers: JSON.stringify(["Karina Kusuma (Ketua)", "Lukman Hakim (Backend)"]),
      submission: {
        project_name: "PantauBansos - Pelacakan Distribusi Bantuan Sosial Tepat Sasaran",
        sub_theme: "Public Service Tracking",
        description: "Sistem pelacakan penyaluran bantuan sosial terintegrasi NIK dengan validasi biometrik wajah dan geolokasi titik distribusi di tingkat kelurahan.",
        flow_application: "1. Petugas kelurahan mencatat penerimaan paket bansos via scan barcode KTP.\n2. Warga dapat mengecek jadwal dan lokasi pos penyaluran terdekat via web portal.\n3. Peta distribusi realtime memonitor persentase bansos yang sudah tersalurkan.\n4. Fitur sanggah publik jika ada indikasi penerima bantuan fiktif atau tidak tepat sasaran.",
        thumbnail_url: "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80",
        links: [
          { link_type: "YOUTUBE", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Video Demo PantauBansos" },
          { link_type: "PROPOSAL", url: "https://docs.google.com/document/d/dummy-pantaubansos/edit", description: "Proposal PantauBansos" },
          { link_type: "GITHUB", url: "https://github.com/example/pantau-bansos-web", description: "GitHub Repository" },
          { link_type: "DEPLOYMENT", url: "https://pantau-bansos.vercel.app", description: "Live Demo" },
        ],
      },
    },
    {
      category: catWebDev,
      userEmail: "peserta.civicreporting.webdev@mia2026.com",
      userName: "Budi Santoso",
      nim: "2410513017",
      teamName: "Tim SuaraWarga WebDev",
      teamMembers: JSON.stringify(["Budi Santoso (Ketua)", "Farhan Maulana (Fullstack)"]),
      submission: {
        project_name: "SuaraWarga - Web Monitoring Realisasi Janji & Proyek Fasilitas Umum",
        sub_theme: "Civic Reporting & Accountability",
        description: "Platform crowdsourcing pengawasan proyek infrastruktur publik dari lelang tender hingga serah terima fisik dengan audit partisipatif warga.",
        flow_application: "1. Pengguna membuka daftar proyek pembangunan jembatan/jalan di kotanya.\n2. Warga mengunggah progres foto riil di lapangan beserta koordinat GPS.\n3. Perbandingan deviasi progres riil vs jadwal kurva-S kontraktor terpampang publik.\n4. Laporan deviasi kritis otomatis memicu notifikasi peringatan ke inspektorat daerah.",
        thumbnail_url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
        links: [
          { link_type: "YOUTUBE", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Video Pitch SuaraWarga" },
          { link_type: "PROPOSAL", url: "https://docs.google.com/document/d/dummy-suarawarga/edit", description: "Dokumen Proposal SuaraWarga" },
          { link_type: "GITHUB", url: "https://github.com/example/suara-warga-portal", description: "GitHub Repository" },
          { link_type: "DEPLOYMENT", url: "https://suarawarga.org", description: "Live URL" },
        ],
      },
    },
    {
      category: catWebDev,
      userEmail: "peserta.decisionsupport.webdev@mia2026.com",
      userName: "Rangga Permana",
      nim: "2410513018",
      teamName: "Tim AnalitikaDaerah WebDev",
      teamMembers: JSON.stringify(["Rangga Permana (Ketua)", "Maya Safitri (Data Analyst)"]),
      submission: {
        project_name: "AnalitikaDaerah - Dashboard Prediksi Distribusi Fasilitas Kesehatan",
        sub_theme: "Data-Driven Decision Support",
        description: "Sistem pendukung keputusan alokasi nakes dan obat-obatan berbasis analisis spasial sebaran penyakit musiman dan demografi lansia.",
        flow_application: "1. Dinas kesehatan memantau peta risiko lonjakan kasus DBD dan ISPA antardesa.\n2. Model estimasi kebutuhan farmasi menghitung alokasi obat darurat otomatis.\n3. Rute logistik armada obat dioptimasi dengan algoritma Traveling Salesperson.\n4. Ringkasan analitik dapat diekspor langsung ke laporan rapat pimpinan daerah.",
        thumbnail_url: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=1200&q=80",
        links: [
          { link_type: "YOUTUBE", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Video AnalitikaDaerah" },
          { link_type: "PROPOSAL", url: "https://docs.google.com/document/d/dummy-analitikadaerah/edit", description: "Proposal DSS Analitika" },
          { link_type: "GITHUB", url: "https://github.com/example/analitika-daerah-web", description: "GitHub Monorepo" },
          { link_type: "DEPLOYMENT", url: "https://analitika-daerah.vercel.app", description: "Live Demo" },
        ],
      },
    },
  ];

  for (const item of subThemeDummies) {
    if (!item.category) {
      console.warn(`⚠️ Category not found for item ${item.submission.project_name}, skipping...`);
      continue;
    }

    // 2. Create or find User
    let userId;
    const [existingUser] = await db
      .select()
      .from(schema.User)
      .where(eq(schema.User.email, item.userEmail))
      .limit(1);

    if (existingUser) {
      userId = existingUser.users_id;
      await db
        .update(schema.User)
        .set({
          name: item.userName,
          password: defaultPassword,
          role: "USER",
          is_verified: true,
          updated_at: new Date(),
        })
        .where(eq(schema.User.users_id, userId));
    } else {
      userId = generateCuid();
      await db.insert(schema.User).values({
        users_id: userId,
        name: item.userName,
        nim: item.nim,
        email: item.userEmail,
        password: defaultPassword,
        role: "USER",
        is_verified: true,
      });
    }

    // 3. Create or find Registration
    let regId;
    const [existingReg] = await db
      .select()
      .from(schema.Registration)
      .where(eq(schema.Registration.team_name, item.teamName))
      .limit(1);

    if (existingReg) {
      regId = existingReg.registration_id;
      await db
        .update(schema.Registration)
        .set({
          user_id: userId,
          category_id: item.category.category_id,
          file_url: "https://drive.google.com/file/d/dummy-registration/view",
          team_members: item.teamMembers,
          is_verified: true,
          is_verified_finance: true,
          xp: 250,
          diamond: 100,
          updated_at: new Date(),
        })
        .where(eq(schema.Registration.registration_id, regId));
    } else {
      regId = generateCuid();
      await db.insert(schema.Registration).values({
        registration_id: regId,
        user_id: userId,
        category_id: item.category.category_id,
        file_url: "https://drive.google.com/file/d/dummy-registration/view",
        team_name: item.teamName,
        team_members: item.teamMembers,
        is_verified: true,
        is_verified_finance: true,
        xp: 250,
        diamond: 100,
      });
    }

    // 4. Create or update Submission with PENDING status
    let subId;
    const [existingSub] = await db
      .select()
      .from(schema.Submission)
      .where(eq(schema.Submission.registration_id, regId))
      .limit(1);

    if (existingSub) {
      subId = existingSub.submission_id;
      await db
        .update(schema.Submission)
        .set({
          project_name: item.submission.project_name,
          sub_theme: item.submission.sub_theme || null,
          description: item.submission.description,
          flow_application: item.submission.flow_application,
          thumbnail_url: item.submission.thumbnail_url,
          status: "PENDING",
          is_verified: false,
          updated_at: new Date(),
        })
        .where(eq(schema.Submission.submission_id, subId));
    } else {
      subId = generateCuid();
      await db.insert(schema.Submission).values({
        submission_id: subId,
        registration_id: regId,
        project_name: item.submission.project_name,
        sub_theme: item.submission.sub_theme || null,
        description: item.submission.description,
        flow_application: item.submission.flow_application,
        thumbnail_url: item.submission.thumbnail_url,
        status: "PENDING",
        is_verified: false,
      });
    }

    // 5. Replace links
    await db.delete(schema.SubmissionLink).where(eq(schema.SubmissionLink.submission_id, subId));
    for (const link of item.submission.links) {
      await db.insert(schema.SubmissionLink).values({
        link_id: generateCuid(),
        submission_id: subId,
        link_type: link.link_type,
        url: link.url,
        description: link.description,
      });
    }

    console.log(`✅ [PENDING SUBTHEME] "${item.submission.project_name}" [${item.submission.sub_theme}] (${item.category.name || item.category.slug})`);
  }

  console.log("🎉 Successfully seeded 1 dummy pending submission per sub-theme!");
}

if (process.argv[1]?.endsWith("seed-subtheme-dummies.js")) {
  seedSubthemeDummies()
    .catch((err) => {
      console.error("❌ Seeding subtheme dummies failed:", err);
      process.exit(1);
    })
    .finally(() => {
      process.exit(0);
    });
}
