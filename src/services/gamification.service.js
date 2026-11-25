import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, or, like, ilike, and, sql, desc, gte, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { generateCuid } from "../db/cuid.js";

const creatorUser = alias(schema.User, "creatorUser");
const updaterUser = alias(schema.User, "updaterUser");
const regCategory = alias(schema.Category, "regCategory");

// Update user points (Admin/Mentor only - legacy compatibility)
export const updateUserPoints = async (userId, pointsToAdd, adminId = null) => {
  // Cari registrasi user
  const [reg] = await db
    .select()
    .from(schema.Registration)
    .where(eq(schema.Registration.user_id, userId))
    .limit(1);
    
  if (!reg) throw new Error("Pendaftaran/tim tidak ditemukan untuk user ini");

  const newDiamond = reg.diamond + pointsToAdd;

  const updateData = { diamond: newDiamond, updated_at: new Date() };
  if (adminId) {
    updateData.updated_by = adminId;
  }

  // Update diamond
  const [updated] = await db
    .update(schema.Registration)
    .set(updateData)
    .where(eq(schema.Registration.registration_id, reg.registration_id))
    .returning();

  return {
    registration_id: updated.registration_id,
    user_id: updated.user_id,
    team_name: updated.team_name,
    diamond: updated.diamond,
    xp: updated.xp,
  };
};

// Update registration gamification (Diamond & XP) - Admin only
export const updateRegistrationGamification = async (
  registrationId,
  { diamond, xp },
  adminId = null
) => {
  const [reg] = await db
    .select({
      registration: schema.Registration,
      category: schema.Category,
      user: schema.User,
    })
    .from(schema.Registration)
    .leftJoin(
      schema.Category,
      eq(schema.Registration.category_id, schema.Category.category_id)
    )
    .leftJoin(
      schema.User,
      eq(schema.Registration.user_id, schema.User.users_id)
    )
    .where(eq(schema.Registration.registration_id, registrationId))
    .limit(1);

  if (!reg) {
    throw new Error("Registration not found");
  }

  const updateData = { updated_at: new Date() };
  if (diamond !== undefined) {
    updateData.diamond = Math.max(0, Math.floor(Number(diamond)));
  }
  if (xp !== undefined) {
    updateData.xp = Math.max(0, Math.floor(Number(xp)));
  }
  if (adminId) {
    updateData.updated_by = adminId;
  }

  const [updated] = await db
    .update(schema.Registration)
    .set(updateData)
    .where(eq(schema.Registration.registration_id, registrationId))
    .returning();

  return {
    ...updated,
    category: reg.category
      ? {
          category_id: reg.category.category_id,
          name: reg.category.name,
          slug: reg.category.slug,
        }
      : null,
    user: reg.user
      ? {
          users_id: reg.user.users_id,
          name: reg.user.name,
          email: reg.user.email,
        }
      : null,
  };
};

// Strict email regex: must start with alphanumeric (blocks Excel/CSV formula prefixes =, +, -, @) and enforce valid domain labels
export const RECIPIENT_EMAIL_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._%+-]{0,63}@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
const FORMULA_PREFIX_REGEX = /^[=+\-@\t\r]/;
const PHONE_DIGITS_REGEX = /^[0-9]{8,16}$/;

export function parseRecipients(raw) {
  if (!raw) return [];
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return raw
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean)
        .map((email) => ({ name: "", email, phone: "" }));
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => {
      if (typeof item === "string" && item.trim()) {
        return { name: "", email: item.trim(), phone: "" };
      }
      if (item && typeof item === "object") {
        const name = typeof item.name === "string" ? item.name.trim() : "";
        const email = typeof item.email === "string" ? item.email.trim() : "";
        const phone = typeof item.phone === "string" ? item.phone.trim() : "";
        if (name || email || phone) {
          return { name, email, phone };
        }
      }
      return null;
    })
    .filter(Boolean);
}

export function parseRecipientEmails(raw) {
  return parseRecipients(raw)
    .map((r) => r.email)
    .filter(Boolean);
}

export function validateAndNormalizeRecipientEmails(rawEmails, isRequired) {
  if (!isRequired) {
    return null;
  }

  let list = [];
  if (Array.isArray(rawEmails)) {
    if (rawEmails.length > 3) {
      throw new Error("Maksimal 3 email penerima yang diperbolehkan.");
    }
    for (const item of rawEmails) {
      if (typeof item !== "string") {
        throw new Error("Format email penerima harus berupa teks email yang valid.");
      }
    }
    list = rawEmails;
  } else if (typeof rawEmails === "string" && rawEmails.trim()) {
    list = parseRecipientEmails(rawEmails);
  } else if (rawEmails !== undefined && rawEmails !== null && rawEmails !== "") {
    throw new Error("Format email penerima harus berupa daftar email.");
  }

  const cleaned = list
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (cleaned.length < 1) {
    throw new Error("Minimal 1 email penerima wajib diisi untuk produk ini.");
  }

  if (cleaned.length > 3) {
    throw new Error("Maksimal 3 email penerima yang diperbolehkan.");
  }

  for (const email of cleaned) {
    if (email.length > 254 || !RECIPIENT_EMAIL_REGEX.test(email)) {
      throw new Error(`Format email penerima tidak valid: ${email}`);
    }
  }

  if (new Set(cleaned).size !== cleaned.length) {
    throw new Error("Email penerima tidak boleh duplikat.");
  }

  return cleaned;
}

export function validateAndNormalizeRecipients(rawRecipients, isRequired, expectedQty = null) {
  // Jika produk tidak memerlukan data penerima, abaikan input agar tidak menyimpan data liar
  if (!isRequired) {
    return null;
  }

  if (expectedQty !== null && (expectedQty < 1 || expectedQty > 3)) {
    throw new Error("Maksimal 3 penerima (jumlah penukaran 1–3) per transaksi.");
  }

  if (!Array.isArray(rawRecipients)) {
    throw new Error("Data penerima wajib diisi (nama, email, dan nomor telepon sesuai jumlah tiket).");
  }

  if (rawRecipients.length > 3) {
    throw new Error("Maksimal 3 penerima yang diperbolehkan.");
  }

  const normalized = [];

  for (let i = 0; i < rawRecipients.length; i++) {
    const item = rawRecipients[i];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("Format data penerima tidak valid.");
    }

    const rawName = item.name === undefined || item.name === null ? "" : item.name;
    const rawEmail = item.email === undefined || item.email === null ? "" : item.email;
    const rawPhone = item.phone === undefined || item.phone === null ? "" : item.phone;

    if (typeof rawName !== "string" || typeof rawEmail !== "string" || typeof rawPhone !== "string") {
      throw new Error("Nama, email, dan nomor telepon penerima harus berupa teks.");
    }

    const name = rawName.trim();
    const email = rawEmail.trim().toLowerCase();
    const phoneNormalized = rawPhone.trim().replace(/[\s\-()]/g, "").replace(/^\+/, "");

    // Slot opsional yang kosong seluruhnya dilewati
    if (!name && !email && !phoneNormalized) {
      continue;
    }

    const label = `Penerima ${i + 1}`;
    if (!name) {
      throw new Error(`Nama ${label} wajib diisi.`);
    }
    if (name.length < 2 || name.length > 100 || FORMULA_PREFIX_REGEX.test(name)) {
      throw new Error(`Nama ${label} tidak valid (2–100 karakter, tidak diawali simbol formula).`);
    }
    if (!email) {
      throw new Error(`Email ${label} wajib diisi.`);
    }
    if (email.length > 254 || !RECIPIENT_EMAIL_REGEX.test(email)) {
      throw new Error(`Format email ${label} tidak valid: ${email}`);
    }
    if (!phoneNormalized) {
      throw new Error(`Nomor telepon ${label} wajib diisi.`);
    }
    if (!PHONE_DIGITS_REGEX.test(phoneNormalized)) {
      throw new Error(`Format nomor telepon ${label} tidak valid (8–16 digit angka).`);
    }

    normalized.push({ name, email, phone: phoneNormalized });
  }

  if (normalized.length < 1) {
    throw new Error("Minimal 1 data penerima (nama, email, dan nomor telepon) wajib diisi untuk produk ini.");
  }

  if (normalized.length > 3) {
    throw new Error("Maksimal 3 penerima yang diperbolehkan.");
  }

  if (expectedQty !== null && normalized.length !== expectedQty) {
    throw new Error(
      `Jumlah data penerima (${normalized.length}) harus sesuai dengan jumlah penukaran (${expectedQty}).`
    );
  }

  const emails = normalized.map((r) => r.email);
  if (new Set(emails).size !== emails.length) {
    throw new Error("Email penerima tidak boleh duplikat.");
  }

  return normalized;
}

// Redeem product with points (with Atomic Conditional Updates to prevent race conditions - Option A)
export const redeemProduct = async (
  userId,
  productId,
  quantity = 1,
  categoryId = null,
  registrationId = null,
  recipientEmails = null
) => {
  const qty = Math.max(1, parseInt(quantity, 10) || 1);

  // Ambil user awal
  const [user] = await db
    .select()
    .from(schema.User)
    .where(eq(schema.User.users_id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  const [product] = await db
    .select()
    .from(schema.product)
    .where(eq(schema.product.product_id, productId))
    .limit(1);

  if (!product) {
    throw new Error("Product not found");
  }

  if (!product.is_active) {
    throw new Error("Product is not active");
  }

  // Jika produk membutuhkan data penerima, batasi jumlah penukaran per transaksi maks 3 dan cocokkan jumlah penerima
  if (product.require_recipient_emails && qty > 3) {
    throw new Error("Maksimal 3 penerima (jumlah penukaran 1–3) per transaksi.");
  }

  // Validasi data penerima (sesuai qty, 1–3 orang: nama, email, no telp) jika produk membutuhkannya
  const normalizedRecipients = validateAndNormalizeRecipients(
    recipientEmails,
    Boolean(product.require_recipient_emails),
    product.require_recipient_emails ? qty : null
  );

  // Tentukan registrasi tim target berdasarkan categoryId, registrationId, atau product.category_id
  const targetCategoryId = categoryId || product.category_id;
  let regConditions = [eq(schema.Registration.user_id, userId)];

  if (registrationId) {
    regConditions.push(eq(schema.Registration.registration_id, registrationId));
  } else if (targetCategoryId) {
    regConditions.push(eq(schema.Registration.category_id, targetCategoryId));
  }

  let [reg] = await db
    .select({
      registration: schema.Registration,
      category: schema.Category,
    })
    .from(schema.Registration)
    .leftJoin(
      schema.Category,
      eq(schema.Registration.category_id, schema.Category.category_id)
    )
    .where(and(...regConditions))
    .limit(1);

  // Jika tidak ditemukan dengan kategori target spesifik:
  // Hanya izinkan fallback ke registrasi user pertama jika produk bersifat GLOBAL (category_id === null)
  if (!reg) {
    if (product.category_id) {
      throw new Error("Produk ini hanya tersedia untuk peserta kategori lomba terkait.");
    }
    [reg] = await db
      .select({
        registration: schema.Registration,
        category: schema.Category,
      })
      .from(schema.Registration)
      .leftJoin(
        schema.Category,
        eq(schema.Registration.category_id, schema.Category.category_id)
      )
      .where(eq(schema.Registration.user_id, userId))
      .limit(1);
  }

  if (!reg || !reg.registration) {
    throw new Error("Pendaftaran/tim tidak ditemukan untuk pengguna ini.");
  }

  // Pastikan jika produk khusus kategori tertentu, registrasi yang digunakan cocok kategorinya
  if (product.category_id && reg.registration.category_id !== product.category_id) {
    throw new Error("Produk ini hanya tersedia untuk peserta kategori lomba terkait.");
  }

  const currentRegistration = reg.registration;
  const currentCategory = reg.category;

  if (!currentRegistration.is_verified) {
    throw new Error("Tim Anda belum diverifikasi oleh panitia.");
  }

  // Validasi batas maksimal penukaran per tim (max_redeem_per_team & is_single_attempt)
  const maxPerTeam = Number(product.max_redeem_per_team) || 0;
  const isSingleAttempt = Boolean(product.is_single_attempt);
  if (maxPerTeam > 0 || isSingleAttempt) {
    if (maxPerTeam > 0 && qty > maxPerTeam) {
      throw new Error(`Kuantitas melebihi batas maksimal penukaran (${maxPerTeam} item per tim).`);
    }

    const [redeemedResult] = await db
      .select({
        attemptCount: sql`COUNT(*)`.as("attemptCount"),
        totalQuantity: sql`COALESCE(SUM(${schema.Redemption.quantity}), 0)`.as("totalQuantity"),
      })
      .from(schema.Redemption)
      .where(
        and(
          eq(schema.Redemption.registration_id, currentRegistration.registration_id),
          eq(schema.Redemption.product_id, productId)
        )
      );

    if (isSingleAttempt && Number(redeemedResult?.attemptCount || 0) >= 1) {
      throw new Error("Tim Anda sudah menggunakan kesempatan 1 kali penukaran untuk produk ini.");
    }

    const alreadyRedeemed = Number(redeemedResult?.totalQuantity || 0);
    if (maxPerTeam > 0) {
      if (alreadyRedeemed >= maxPerTeam) {
        throw new Error(`Produk ini telah mencapai batas maksimal penukaran (${maxPerTeam} item per tim).`);
      }

      if (alreadyRedeemed + qty > maxPerTeam) {
        const remainingQuota = maxPerTeam - alreadyRedeemed;
        throw new Error(
          `Anda hanya dapat menukar ${remainingQuota} item lagi untuk produk ini (maksimal ${maxPerTeam} item per tim).`
        );
      }
    }
  }

  const pointsNeeded = (Number(product.price_diamond) || 0) * qty;
  const xpNeeded = (Number(product.price_xp) || 0) * qty;
  // Jika produk memiliki harga XP, produk tidak dapat dikonversi ke XP (reward_xp = 0)
  const earnedXp = Number(product.price_xp) > 0 ? 0 : (Number(product.reward_xp) || 0) * qty;
  const redemptionId = generateCuid();

  // Validasi saldo diamond dan XP sebelum memulai transaksi
  if (pointsNeeded > 0 && currentRegistration.diamond < pointsNeeded) {
    throw new Error("Insufficient points");
  }
  if (xpNeeded > 0 && currentRegistration.xp < xpNeeded) {
    throw new Error("Insufficient XP");
  }

  let updatedRegistration;
  let updatedProduct;

  // Kurangi diamond & XP tim (dan tambah XP jika reward_xp > 0 & harga XP = 0) serta kurangi stok produk di dalam transaksi
  await db.transaction(async (tx) => {
    // 1. Update stok produk: Jika TIDAK unlimited, HANYA kurangi jika stok saat ini masih >= qty dan produk masih aktif
    if (!product.is_unlimited_stock) {
      const [p] = await tx
        .update(schema.product)
        .set({
          stock: sql`${schema.product.stock} - ${qty}`,
          updated_by: userId,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(schema.product.product_id, productId),
            eq(schema.product.is_active, true),
            gte(schema.product.stock, qty)
          )
        )
        .returning();

      if (!p) {
        throw new Error("Sorry, product is out of stock :(");
      }
      updatedProduct = p;
    } else {
      // Jika unlimited stock, pastikan produk tetap aktif
      const [p] = await tx
        .select()
        .from(schema.product)
        .where(
          and(
            eq(schema.product.product_id, productId),
            eq(schema.product.is_active, true)
          )
        )
        .limit(1);

      if (!p) {
        throw new Error("Product is not active");
      }
      updatedProduct = p;
    }

    // 2. Update diamond & XP tim: HANYA kurangi jika diamond dan/atau XP saat ini masih mencukupi
    const regUpdateFields = {
      updated_by: userId,
      updated_at: new Date(),
    };
    if (pointsNeeded > 0) {
      regUpdateFields.diamond = sql`${schema.Registration.diamond} - ${pointsNeeded}`;
    }
    if (xpNeeded > 0) {
      regUpdateFields.xp = sql`${schema.Registration.xp} - ${xpNeeded}`;
    } else if (earnedXp > 0) {
      regUpdateFields.xp = sql`${schema.Registration.xp} + ${earnedXp}`;
    }

    const regConditions = [
      eq(schema.Registration.registration_id, currentRegistration.registration_id),
    ];
    if (pointsNeeded > 0) {
      regConditions.push(gte(schema.Registration.diamond, pointsNeeded));
    }
    if (xpNeeded > 0) {
      regConditions.push(gte(schema.Registration.xp, xpNeeded));
    }

    const [u] = await tx
      .update(schema.Registration)
      .set(regUpdateFields)
      .where(and(...regConditions))
      .returning();

    if (!u) {
      throw new Error(
        pointsNeeded > 0 && xpNeeded > 0
          ? "Insufficient points or XP"
          : xpNeeded > 0
          ? "Insufficient XP"
          : "Insufficient points"
      );
    }
    updatedRegistration = u;

    // 3. Validasi batas kuota & attempt tim di dalam transaksi (sesudah row lock Registration) untuk mencegah race condition
    if (maxPerTeam > 0 || isSingleAttempt) {
      const [txRedeemed] = await tx
        .select({
          attemptCount: sql`COUNT(*)`.as("attemptCount"),
          totalQuantity: sql`COALESCE(SUM(${schema.Redemption.quantity}), 0)`.as("totalQuantity"),
        })
        .from(schema.Redemption)
        .where(
          and(
            eq(schema.Redemption.registration_id, currentRegistration.registration_id),
            eq(schema.Redemption.product_id, productId)
          )
        );
      if (isSingleAttempt && Number(txRedeemed?.attemptCount || 0) >= 1) {
        throw new Error("Tim Anda sudah menggunakan kesempatan 1 kali penukaran untuk produk ini.");
      }
      const currentAlreadyRedeemed = Number(txRedeemed?.totalQuantity || 0);
      if (maxPerTeam > 0 && currentAlreadyRedeemed + qty > maxPerTeam) {
        throw new Error(`Batas maksimal penukaran produk (${maxPerTeam} item per tim) terlampaui.`);
      }
    }

    // 4. Catat riwayat penukaran hadiah beserta diamond_used, xp_used, quantity, dan recipient_emails
    await tx
      .insert(schema.Redemption)
      .values({
        redemption_id: redemptionId,
        registration_id: currentRegistration.registration_id,
        product_id: productId,
        diamond_used: pointsNeeded,
        xp_used: xpNeeded,
        quantity: qty,
        recipient_emails: normalizedRecipients
          ? JSON.stringify(normalizedRecipients)
          : null,
        created_by: userId,
        updated_by: userId,
      });
  });

  return {
    registration_id: currentRegistration.registration_id,
    redemption_id: redemptionId,
    diamond_used: pointsNeeded,
    points_used: pointsNeeded,
    xp_used: xpNeeded,
    recipients: normalizedRecipients || [],
    recipient_emails: (normalizedRecipients || []).map((r) => r.email),
    registration: {
      registration_id: updatedRegistration.registration_id,
      category_id: updatedRegistration.category_id,
      category_name: currentCategory?.name || null,
      team_name: updatedRegistration.team_name,
      diamond: updatedRegistration.diamond,
      xp: updatedRegistration.xp,
    },
    user: {
      users_id: user.users_id,
      name: user.name,
      email: user.email,
      diamond: updatedRegistration.diamond,
      xp: updatedRegistration.xp,
      team_name: updatedRegistration.team_name,
    },
    product: {
      product_id: updatedProduct.product_id,
      name: updatedProduct.name,
      price_diamond: updatedProduct.price_diamond,
      price_xp: updatedProduct.price_xp,
      stock: updatedProduct.stock,
      reward_xp: updatedProduct.reward_xp,
      is_unlimited_stock: updatedProduct.is_unlimited_stock,
      max_redeem_per_team: updatedProduct.max_redeem_per_team,
      is_single_attempt: Boolean(updatedProduct.is_single_attempt),
      is_single_redeem: Number(updatedProduct.max_redeem_per_team) === 1,
    },
    quantity: qty,
    earned_xp: earnedXp,
  };
};

// Get all redemption history (admin only)
export const getAllRedeemUser = async (filters = {}) => {
  const safePage = Math.max(1, parseInt(filters.page, 10) || 1);
  const safeLimit = Math.min(500, Math.max(1, parseInt(filters.limit, 10) || 10));
  const skip = (safePage - 1) * safeLimit;
  const { search, user_id, registration_id, product_id, category_id } = filters;

  const conditions = [];

  if (registration_id) conditions.push(eq(schema.Redemption.registration_id, registration_id));
  if (user_id) conditions.push(eq(schema.Registration.user_id, user_id));
  if (product_id) conditions.push(eq(schema.Redemption.product_id, product_id));
  if (category_id) {
    if (category_id.toLowerCase() === "global") {
      conditions.push(isNull(schema.product.category_id));
    } else if (category_id.toLowerCase() !== "all") {
      conditions.push(eq(schema.product.category_id, category_id));
    }
  }

  if (search && search.trim()) {
    const searchPattern = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(schema.Registration.team_name, searchPattern),
        ilike(schema.User.name, searchPattern),
        ilike(schema.product.name, searchPattern),
        ilike(schema.User.email, searchPattern),
        ilike(schema.User.whatsapp_number, searchPattern),
        ilike(schema.Registration.team_members, searchPattern),
        ilike(schema.Redemption.recipient_emails, searchPattern)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [countResult]] = await Promise.all([
    db
      .select({
        Redemption: schema.Redemption,
        Registration: schema.Registration,
        regCategory: regCategory,
        User: schema.User,
        product: schema.product,
        category: schema.Category,
        creator: { name: creatorUser.name, email: creatorUser.email },
        updater: { name: updaterUser.name, email: updaterUser.email },
      })
      .from(schema.Redemption)
      .leftJoin(
        schema.Registration,
        eq(schema.Redemption.registration_id, schema.Registration.registration_id)
      )
      .leftJoin(
        regCategory,
        eq(schema.Registration.category_id, regCategory.category_id)
      )
      .leftJoin(
        schema.User,
        eq(schema.Registration.user_id, schema.User.users_id)
      )
      .leftJoin(schema.product, eq(schema.Redemption.product_id, schema.product.product_id))
      .leftJoin(schema.Category, eq(schema.product.category_id, schema.Category.category_id))
      .leftJoin(creatorUser, eq(schema.Redemption.created_by, creatorUser.users_id))
      .leftJoin(updaterUser, eq(schema.Redemption.updated_by, updaterUser.users_id))
      .where(whereClause)
      .orderBy(desc(schema.Redemption.created_at))
      .limit(safeLimit)
      .offset(skip),
    db
      .select({ count: sql`count(*)` })
      .from(schema.Redemption)
      .leftJoin(
        schema.Registration,
        eq(schema.Redemption.registration_id, schema.Registration.registration_id)
      )
      .leftJoin(
        regCategory,
        eq(schema.Registration.category_id, regCategory.category_id)
      )
      .leftJoin(
        schema.User,
        eq(schema.Registration.user_id, schema.User.users_id)
      )
      .leftJoin(schema.product, eq(schema.Redemption.product_id, schema.product.product_id))
      .leftJoin(schema.Category, eq(schema.product.category_id, schema.Category.category_id))
      .where(whereClause),
  ]);

  const redemptions = rows.map((row) => {
    const parsedRecipients = parseRecipients(row.Redemption.recipient_emails);
    return {
    ...row.Redemption,
    recipients: parsedRecipients,
    recipient_emails: parsedRecipients.map((r) => r.email).filter(Boolean),
    diamond_used: row.Redemption.diamond_used,
    points_used: row.Redemption.diamond_used,
    user_id: row.Registration?.user_id || row.User?.users_id || null,
    registration: row.Registration
      ? {
          registration_id: row.Registration.registration_id,
          user_id: row.Registration.user_id,
          category_id: row.Registration.category_id,
          category_name: row.regCategory?.name || null,
          category_slug: row.regCategory?.slug || null,
          team_name: row.Registration.team_name,
          team_members: row.Registration.team_members,
        }
      : null,
    user: row.User
      ? {
          users_id: row.User.users_id,
          name: row.User.name,
          email: row.User.email,
          whatsapp_number: row.User.whatsapp_number,
          whatsapp: row.User.whatsapp_number,
        }
      : null,
    category: row.category
      ? {
          category_id: row.category.category_id,
          name: row.category.name,
          category_name: row.category.name,
          slug: row.category.slug,
        }
      : null,
    product: row.product
      ? {
          product_id: row.product.product_id,
          name: row.product.name,
          category_id: row.product.category_id,
          category: row.category
            ? {
                category_id: row.category.category_id,
                name: row.category.name,
                category_name: row.category.name,
                slug: row.category.slug,
              }
            : null,
          price_diamond: row.product.price_diamond,
          price_xp: row.product.price_xp,
          image_url: row.product.image_url,
          is_unlimited_stock: row.product.is_unlimited_stock,
          max_redeem_per_team: row.product.max_redeem_per_team,
          is_single_attempt: Boolean(row.product.is_single_attempt),
          is_single_redeem: Number(row.product.max_redeem_per_team) === 1,
          reward_xp: row.product.reward_xp,
        }
      : null,
    created_by_name: row.creator?.name || row.Redemption.created_by || "-",
    updated_by_name: row.updater?.name || row.Redemption.updated_by || "-",
  };
  });

  const total = Number(countResult?.count || 0);

  return {
    redemptions,
    meta: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
};

// Get user's own redemption history
export const getMyRedeem = async (userId, filters = {}) => {
  const safePage = Math.max(1, parseInt(filters.page, 10) || 1);
  const safeLimit = Math.min(500, Math.max(1, parseInt(filters.limit, 10) || 10));
  const skip = (safePage - 1) * safeLimit;
  const { search, product_id, category_id, registration_id } = filters;

  const conditions = [eq(schema.Registration.user_id, userId)];
  if (registration_id) conditions.push(eq(schema.Redemption.registration_id, registration_id));
  if (product_id) conditions.push(eq(schema.Redemption.product_id, product_id));
  if (category_id) {
    conditions.push(
      or(
        eq(schema.product.category_id, category_id),
        eq(schema.Registration.category_id, category_id),
        isNull(schema.product.category_id)
      )
    );
  }

  if (search && search.trim()) {
    conditions.push(ilike(schema.product.name, `%${search.trim()}%`));
  }

  const whereClause = and(...conditions);

  const [rows, [countResult]] = await Promise.all([
    db
      .select({
        Redemption: schema.Redemption,
        Registration: schema.Registration,
        regCategory: regCategory,
        product: schema.product,
        category: schema.Category,
      })
      .from(schema.Redemption)
      .innerJoin(
        schema.Registration,
        eq(schema.Redemption.registration_id, schema.Registration.registration_id)
      )
      .leftJoin(
        regCategory,
        eq(schema.Registration.category_id, regCategory.category_id)
      )
      .leftJoin(schema.product, eq(schema.Redemption.product_id, schema.product.product_id))
      .leftJoin(schema.Category, eq(schema.product.category_id, schema.Category.category_id))
      .where(whereClause)
      .orderBy(desc(schema.Redemption.created_at))
      .limit(safeLimit)
      .offset(skip),
    db
      .select({ count: sql`count(*)` })
      .from(schema.Redemption)
      .innerJoin(
        schema.Registration,
        eq(schema.Redemption.registration_id, schema.Registration.registration_id)
      )
      .leftJoin(
        regCategory,
        eq(schema.Registration.category_id, regCategory.category_id)
      )
      .leftJoin(schema.product, eq(schema.Redemption.product_id, schema.product.product_id))
      .where(whereClause),
  ]);

  const redemptions = rows.map((row) => {
    const parsedRecipients = parseRecipients(row.Redemption.recipient_emails);
    return {
    ...row.Redemption,
    recipients: parsedRecipients,
    recipient_emails: parsedRecipients.map((r) => r.email).filter(Boolean),
    diamond_used: row.Redemption.diamond_used,
    points_used: row.Redemption.diamond_used,
    user_id: row.Registration?.user_id || userId,
    registration: row.Registration
      ? {
          registration_id: row.Registration.registration_id,
          category_id: row.Registration.category_id,
          category_name: row.regCategory?.name || null,
          category_slug: row.regCategory?.slug || null,
          team_name: row.Registration.team_name,
        }
      : null,
    product: row.product
      ? {
          product_id: row.product.product_id,
          category_id: row.product.category_id,
          category: row.category
            ? {
                category_id: row.category.category_id,
                name: row.category.name,
                category_name: row.category.name,
                slug: row.category.slug,
              }
            : null,
          name: row.product.name,
          price_diamond: row.product.price_diamond,
          price_xp: row.product.price_xp,
          image_url: row.product.image_url,
          is_unlimited_stock: row.product.is_unlimited_stock,
          max_redeem_per_team: row.product.max_redeem_per_team,
          is_single_attempt: Boolean(row.product.is_single_attempt),
          is_single_redeem: Number(row.product.max_redeem_per_team) === 1,
          reward_xp: row.product.reward_xp,
        }
      : null,
  };
  });

  const total = Number(countResult?.count || 0);

  return {
    redemptions,
    meta: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
};