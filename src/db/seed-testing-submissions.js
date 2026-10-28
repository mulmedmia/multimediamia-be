import { db } from "./index.js";
import * as schema from "./schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { generateCuid } from "./cuid.js";

dotenv.config();

export async function seedTestingSubmissions() {
  console.log("🌱 Injecting dummy pending submissions for testing...");

  const saltRounds = 10;
  const defaultPassword = await bcrypt.hash("Password123!", saltRounds);

  // 1. Fetch available categories
  const categories = await db.select().from(schema.Category);
  if (categories.length === 0) {
    throw new Error("No categories found. Please run category seeds first.");
  }

  const findCat = (query) => {
    const q = query.toLowerCase();
    return categories.find(
      (c) =>
        c.category_id === query ||
        c.name?.toLowerCase().includes(q) ||
        c.slug?.toLowerCase().includes(q)
    ) || categories[0];
  };

  const uiuxCat = findCat("ui/ux") || categories[0];
  const webdevCat = findCat("web") || (categories[1] || categories[0]);
  const appCat = findCat("app") || (categories[2] || categories[0]);

  const testDummies = [
    {
      userEmail: "peserta.garuda@mia2026.com",
      userName: "Budi Pratama",
      nim: "2410512001",
      teamName: "Tim Garuda Inovasi",
      teamMembers: JSON.stringify(["Budi Pratama (Ketua)", "Ahmad Fauzi (Anggota)", "Rina Lestari (Anggota)"]),
      category: uiuxCat,
      submission: {
        project_name: "AgroSmart - Solusi Ekosistem Petani Modern",
        sub_theme: "Local Business Empowerment, Sustainable Environment",
        description: "AgroSmart merupakan platform desain aplikasi mobile berbasis kecerdasan buatan untuk membantu petani lokal memonitor harga komoditas pasar, cuaca mikro, dan menghubungkan hasil panen langsung ke konsumen tanpa perantara tengkulak.",
        flow_application: "1. Pengguna membuka aplikasi dan melakukan autentikasi biometrik.\n2. Dashboard menampilkan insight cuaca dan fluktuasi harga komoditas lokal terkini.\n3. Petani mendaftarkan komoditas panen yang siap dijual.\n4. Sistem mencocokkan stok dengan permintaan pasar UMKM terdekat.\n5. Transaksi diselesaikan secara otomatis dengan payment gateway QRIS terverifikasi.",
        thumbnail_url: "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=80",
        links: [
          { link_type: "YOUTUBE", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Video Pitching & Prototype Walkthrough" },
          { link_type: "PROPOSAL", url: "https://docs.google.com/document/d/1dummy-proposal-garuda/edit", description: "Draft Proposal Lengkap AgroSmart" },
          { link_type: "PRESENTATION", url: "https://www.canva.com/design/dummy-presentation-garuda/view", description: "Slide Presentasi Finalist" },
          { link_type: "ORIGINALITY_STATEMENT", url: "https://drive.google.com/file/d/dummy-originality-garuda/view", description: "Surat Pernyataan Orisinalitas Bermaterai" },
          { link_type: "FIGMA", url: "https://www.figma.com/design/dummy-agrosmart-ui/", description: "Desain UI High Fidelity" },
          { link_type: "FIGMA_PROTOTYPE", url: "https://www.figma.com/proto/dummy-agrosmart-proto/", description: "Interactive Figma Prototype" },
        ],
      },
    },
    {
      userEmail: "peserta.cyber@mia2026.com",
      userName: "Siti Rahma",
      nim: "2410512002",
      teamName: "Tim Cyber Nusantara",
      teamMembers: JSON.stringify(["Siti Rahma (Ketua)", "Fajar Nugraha (Fullstack)", "Dian Pratama (DevOps)"]),
      category: webdevCat,
      submission: {
        project_name: "HealthSync - Rekam Medis AI Terintegrasi",
        sub_theme: "Public Service Tracking, Data-Driven Decision Support",
        description: "HealthSync adalah platform web telemedicine dan interoperabilitas rekam medis digital berbasis FHIR standard yang mengintegrasikan riwayat pasien antar klinik puskesmas secara instan dan aman.",
        flow_application: "1. Pasien mendaftar menggunakan NIK terverifikasi SatuSehat.\n2. Dokter dapat mengakses riwayat alergi, diagnosis, dan resep terdahulu secara real-time.\n3. Fitur telekonsultasi dengan video call WebRTC terenkripsi end-to-end.\n4. Pengiriman resep elektronik langsung terhubung ke apotek rekanan terdekat.",
        thumbnail_url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80",
        links: [
          { link_type: "YOUTUBE", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Video Demo Aplikasi HealthSync" },
          { link_type: "PROPOSAL", url: "https://docs.google.com/document/d/1dummy-proposal-cyber/edit", description: "Proposal Teknis & Arsitektur Sistem" },
          { link_type: "PRESENTATION", url: "https://www.canva.com/design/dummy-presentation-cyber/view", description: "Pitch Deck HealthSync" },
          { link_type: "ORIGINALITY_STATEMENT", url: "https://drive.google.com/file/d/dummy-originality-cyber/view", description: "Surat Orisinalitas Karya Tim Cyber Nusantara" },
          { link_type: "GITHUB", url: "https://github.com/example/healthsync-core", description: "Source Code Frontend & Backend Monorepo" },
          { link_type: "DEPLOYMENT", url: "https://healthsync-demo.vercel.app", description: "Live Production Web Demo" },
        ],
      },
    },
    {
      userEmail: "peserta.karsa@mia2026.com",
      userName: "Dimas Wicaksono",
      nim: "2410512003",
      teamName: "Tim Karsa Karya",
      teamMembers: JSON.stringify(["Dimas Wicaksono (Ketua)", "Bayu Saputra (Mobile Dev)"]),
      category: appCat,
      submission: {
        project_name: "LenteraDisabilitas - Navigasi Ruang Publik Ramah Difabel",
        description: "Aplikasi asisten navigasi ramah disabilitas sensorik dan motorik dengan crowdsourcing peta fasilitas ramah kursi roda, ramah tuna netra dengan panduan suara audio spatial haptik.",
        flow_application: "1. Pengguna menentukan mode aksesibilitas (Tunanetra, Kursi Roda, Tunarungu).\n2. Sistem rute menghitung jalur paling landai dan ramah fasilitas penunjang.\n3. Panduan suara real-time aktif dengan deteksi rintangan berbasis Computer Vision kamera.\n4. Komunitas pengguna dapat melaporkan fasilitas rusak atau baru secara crowdsourced.",
        thumbnail_url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
        links: [
          { link_type: "YOUTUBE", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Video Showcase & Uji Coba Pengguna" },
          { link_type: "PROPOSAL", url: "https://docs.google.com/document/d/1dummy-proposal-karsa/edit", description: "Dokumen Spesifikasi Teknis Lentera" },
          { link_type: "PRESENTATION", url: "https://www.canva.com/design/dummy-presentation-karsa/view", description: "Slide Presentasi Finalis MIA 2026" },
          { link_type: "ORIGINALITY_STATEMENT", url: "https://drive.google.com/file/d/dummy-originality-karsa/view", description: "Surat Orisinalitas Bermaterai Resmi" },
          { link_type: "GITHUB", url: "https://github.com/example/lentera-mobile", description: "Repository Mobile App Flutter" },
          { link_type: "DEPLOYMENT", url: "https://lentera-preview.web.app", description: "Web Preview & APK Download" },
        ],
      },
    },
    {
      userEmail: "peserta.aurora@mia2026.com",
      userName: "Anisa Putri",
      nim: "2410512004",
      teamName: "Tim Aurora Studio",
      teamMembers: JSON.stringify(["Anisa Putri (Lead UX)", "Nabila Safitri (UI Designer)"]),
      category: uiuxCat,
      submission: {
        project_name: "FinYouth - Edukasi Keuangan Interaktif Gamifikasi",
        sub_theme: "Inclusive Learning, Local Business Empowerment",
        description: "FinYouth adalah konsep platform edukasi finansial untuk Gen Z dan Alpha dengan integrasi virtual pet, tantangan menabung mikro, dan simulasi investasi berbasis skenario kehidupan nyata.",
        flow_application: "1. Pengguna membuat avatar dan virtual pet pendamping finansial.\n2. Memilih misi harian: alokasi uang jajan atau kuis literasi saham/reksadana.\n3. Setiap pencapaian memberikan token XP untuk meningkatkan level virtual pet.\n4. Terdapat fitur simulasi 'Life Event' untuk belajar dana darurat.",
        thumbnail_url: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80",
        links: [
          { link_type: "YOUTUBE", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Video walkthrough prototipe FinYouth" },
          { link_type: "PROPOSAL", url: "https://docs.google.com/document/d/1dummy-proposal-aurora/edit", description: "Proposal Studi UX & Desain" },
          { link_type: "PRESENTATION", url: "https://www.canva.com/design/dummy-presentation-aurora/view", description: "Presentasi Konsep FinYouth" },
          { link_type: "ORIGINALITY_STATEMENT", url: "https://drive.google.com/file/d/dummy-originality-aurora/view", description: "Surat Pernyataan Keaslian Karya" },
          { link_type: "FIGMA", url: "https://www.figma.com/design/dummy-finyouth-ui/", description: "Figma File Desain & Design System" },
        ],
      },
    },
  ];

  for (const item of testDummies) {
    // 2. Create or find user
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

    // 3. Create or find registration
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
          file_url: "https://drive.google.com/file/d/dummy-registration-docs/view",
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
        file_url: "https://drive.google.com/file/d/dummy-registration-docs/view",
        team_name: item.teamName,
        team_members: item.teamMembers,
        is_verified: true,
        is_verified_finance: true,
        xp: 250,
        diamond: 100,
      });
    }

    // 4. Create or update submission with status = PENDING
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

    console.log(`✅ [PENDING SUBMISSION] "${item.submission.project_name}" (${item.teamName}) created for ${item.category.name || item.category.slug}`);
  }

  console.log("🎉 Successfully seeded 4 pending submissions ready for admin review!");
}

if (process.argv[1]?.endsWith("seed-testing-submissions.js")) {
  seedTestingSubmissions()
    .catch((err) => {
      console.error("❌ Seeding failed:", err);
      process.exit(1);
    })
    .finally(() => {
      process.exit(0);
    });
}
