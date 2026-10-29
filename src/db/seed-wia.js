import { db } from "./index.js";
import * as schema from "./schema.js";
import { eq, or, ilike } from "drizzle-orm";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { generateCuid } from "./cuid.js";

dotenv.config();

export async function seedWiaSubmissions() {
  console.log("🌱 Injecting dummy submissions for Web In Action (WIA)...");

  // 1. Find Web In Action category
  const categories = await db.select().from(schema.Category);
  let wiaCat = categories.find(
    (c) =>
      c.name?.toLowerCase().includes("web in action") ||
      c.slug?.toUpperCase() === "WIA" ||
      c.category_id === "c67f3a54457ba4d1ef8f2fc9a"
  );

  if (!wiaCat) {
    console.log("Category Web In Action not found, creating it...");
    const adminUser = (await db.select().from(schema.User).where(eq(schema.User.role, "ADMIN")).limit(1))[0];
    const catId = generateCuid();
    [wiaCat] = await db
      .insert(schema.Category)
      .values({
        category_id: catId,
        slug: "WIA",
        name: "Web In Action",
        organizer: "Panitia MIA 2026",
        description: "Kompetisi pembuatan dan pengembangan aplikasi website Web In Action (WIA) - Multimedia In Action 2026.",
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        is_submission_open: true,
        allow_revision: false,
        is_show_it_open: false,
        image: "https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=1200&q=80",
        team_type: "GROUP",
        status: "VERIFIED",
        created_by: adminUser?.users_id,
        updated_by: adminUser?.users_id,
      })
      .returning();
  }

  console.log(`Using Category: "${wiaCat.name}" (ID: ${wiaCat.category_id}, Slug: ${wiaCat.slug})`);

  const saltRounds = 10;
  const defaultPassword = await bcrypt.hash("Password123!", saltRounds);

  const wiaDummies = [
    {
      userEmail: "peserta.wia1@mia2026.com",
      userName: "Reza Pratama",
      nim: "2410512101",
      teamName: "Tim DevCraft WIA",
      teamMembers: JSON.stringify(["Reza Pratama (Ketua)", "Gilang Ramadhan (Frontend)", "Aulia Zahra (Backend)"]),
      submission: {
        project_name: "NusantaraLearn - Platform Web Pembelajaran Adaptif AI",
        sub_theme: "Public Service Tracking, Data-Driven Decision Support",
        description: "Aplikasi web e-learning adaptif untuk siswa di pelosok nusantara dengan arsitektur PWA offline-first, konsumsi bandwidth ultra-rendah, serta bimbingan AI tutor suara interaktif.",
        flow_application: "1. Siswa mendaftar dan memilih jenjang kurikulum nasional.\n2. Aplikasi mengunduh paket materi terkompresi untuk akses offline tanpa internet.\n3. Fitur kuis evaluasi cerdas memberikan feedback rekomendasi materi kelemahan siswa.\n4. Saat terhubung internet, sinkronisasi progres belajar otomatis tersimpan ke cloud.",
        thumbnail_url: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&w=1200&q=80",
        links: [
          { link_type: "YOUTUBE", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Video Pitching & Live Demo NusantaraLearn" },
          { link_type: "PROPOSAL", url: "https://docs.google.com/document/d/1dummy-proposal-devcraft/edit", description: "Proposal Teknis & Spesifikasi NusantaraLearn" },
          { link_type: "PRESENTATION", url: "https://www.canva.com/design/dummy-presentation-devcraft/view", description: "Slide Presentasi Finalis WIA 2026" },
          { link_type: "ORIGINALITY_STATEMENT", url: "https://drive.google.com/file/d/dummy-originality-devcraft/view", description: "Surat Orisinalitas Bermaterai 10k" },
          { link_type: "GITHUB", url: "https://github.com/example/nusantara-learn-web", description: "Monorepo Next.js & Hono Backend" },
          { link_type: "DEPLOYMENT", url: "https://nusantara-learn.vercel.app", description: "Live Production Web Demo" },
        ],
      },
    },
    {
      userEmail: "peserta.wia2@mia2026.com",
      userName: "Fadhil Rahman",
      nim: "2410512102",
      teamName: "Tim ByteCrafters WIA",
      teamMembers: JSON.stringify(["Fadhil Rahman (Ketua)", "Irfan Maulana (Fullstack)"]),
      submission: {
        project_name: "PasarTani.id - Marketplace Komoditas Hasil Panen Langsung",
        sub_theme: "Open Government Data, Data-Driven Decision Support",
        description: "Platform web marketplace agritech B2B & B2C yang menghubungkan kelompok tani lokal dengan pelaku bisnis kuliner & retail secara langsung dengan sistem lelang digital dan tracking cold-chain logistics.",
        flow_application: "1. Petani mengunggah hasil panen, varietas, perkiraan panen, dan kuota tonase.\n2. Pembeli komersial (hotel/restoran) memasang bid lelang secara real-time.\n3. Pembayaran terkunci aman di escrow hingga konfirmasi kualitas pesanan tiba di gudang.\n4. Dashboard analitik memberikan insight harga pasar komoditas nasional harian.",
        thumbnail_url: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
        links: [
          { link_type: "YOUTUBE", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Video Showcase & Demo Transaksi PasarTani" },
          { link_type: "PROPOSAL", url: "https://docs.google.com/document/d/1dummy-proposal-pasartani/edit", description: "Proposal Bisnis & Implementasi Sistem PasarTani" },
          { link_type: "PRESENTATION", url: "https://www.canva.com/design/dummy-presentation-pasartani/view", description: "Deck Presentasi WIA" },
          { link_type: "ORIGINALITY_STATEMENT", url: "https://drive.google.com/file/d/dummy-originality-pasartani/view", description: "Lembar Pernyataan Orisinalitas Tim ByteCrafters" },
          { link_type: "GITHUB", url: "https://github.com/example/pasartani-web", description: "Source Code Frontend & Backend" },
          { link_type: "DEPLOYMENT", url: "https://pasartani-id.vercel.app", description: "Live Web Demo PasarTani" },
        ],
      },
    },
    {
      userEmail: "peserta.wia3@mia2026.com",
      userName: "Nadya Putri",
      nim: "2410512103",
      teamName: "Tim KarsaWeb WIA",
      teamMembers: JSON.stringify(["Nadya Putri (Ketua)", "Zaki Akbar (Backend)", "Tari Wulandari (UI/Frontend)"]),
      submission: {
        project_name: "SiagaBencana - Portal Respons Cepat & Peta Risiko Interaktif",
        sub_theme: "Civic Reporting & Accountability, Public Service Tracking",
        description: "Sistem informasi tanggap darurat dan peringatan dini bencana berbasis web GIS dengan visualisasi peta interaktif 3D, integrasi sensor IoT stasiun sungai, serta koordinasi posko relawan terverifikasi.",
        flow_application: "1. Pengguna membuka portal peta risiko interaktif dengan layer banjir, gempa, dan longsor.\n2. Sistem realtime websocket mengirim peringatan saat level sensor sungai melewati ambang batas siaga 1.\n3. Warga dapat melihat jalur evakuasi aman terdekat dengan rute dinamis bebas rintangan.\n4. Relawan mendaftarkan ketersediaan logistik dan kebutuhan obat-obatan posko.",
        thumbnail_url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
        links: [
          { link_type: "YOUTUBE", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Video Demo Sistem SiagaBencana & Navigasi Evakuasi" },
          { link_type: "PROPOSAL", url: "https://docs.google.com/document/d/1dummy-proposal-siagabencana/edit", description: "Dokumen Proposal & Desain Arsitektur SiagaBencana" },
          { link_type: "PRESENTATION", url: "https://www.canva.com/design/dummy-presentation-siagabencana/view", description: "Slide Presentasi Finalis SiagaBencana" },
          { link_type: "ORIGINALITY_STATEMENT", url: "https://drive.google.com/file/d/dummy-originality-siagabencana/view", description: "Surat Pernyataan Keaslian Karya" },
          { link_type: "GITHUB", url: "https://github.com/example/siaga-bencana-portal", description: "Repository GitHub Fullstack Next.js" },
          { link_type: "DEPLOYMENT", url: "https://siagabencana.org", description: "Demo URL SiagaBencana" },
        ],
      },
    },
  ];

  for (const item of wiaDummies) {
    // 2. User
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

    // 3. Registration under WIA
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
          category_id: wiaCat.category_id,
          file_url: "https://drive.google.com/file/d/dummy-registration-wia/view",
          team_members: item.teamMembers,
          is_verified: true,
          is_verified_finance: true,
          xp: 300,
          diamond: 150,
          updated_at: new Date(),
        })
        .where(eq(schema.Registration.registration_id, regId));
    } else {
      regId = generateCuid();
      await db.insert(schema.Registration).values({
        registration_id: regId,
        user_id: userId,
        category_id: wiaCat.category_id,
        file_url: "https://drive.google.com/file/d/dummy-registration-wia/view",
        team_name: item.teamName,
        team_members: item.teamMembers,
        is_verified: true,
        is_verified_finance: true,
        xp: 300,
        diamond: 150,
      });
    }

    // 4. Submission under Registration with status = PENDING
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

    // 5. Links
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

    console.log(`✅ [WIA SUBMISSION PENDING] "${item.submission.project_name}" (${item.teamName})`);
  }

  console.log("🎉 Successfully seeded 3 dummy submissions for Web In Action!");
}

if (process.argv[1]?.endsWith("seed-wia.js")) {
  seedWiaSubmissions()
    .catch((err) => {
      console.error("❌ Seeding WIA failed:", err);
      process.exit(1);
    })
    .finally(() => {
      process.exit(0);
    });
}
