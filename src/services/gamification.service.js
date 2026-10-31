import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, or, like, and, sql, desc, gte, isNull } from "drizzle-orm";
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

// Redeem product with points (with Atomic Conditional Updates to prevent race conditions - Option A)
export const redeemProduct = async (userId, productId, quantity = 1, categoryId = null, registrationId = null) => {
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

  // Jika tidak ditemukan dengan kategori target spesifik, fallback ke registrasi user pertama
  if (!reg) {
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

  const currentRegistration = reg.registration;
  const currentCategory = reg.category;

  // Validasi batas maksimal penukaran per tim (max_redeem_per_team)
  const maxPerTeam = Number(product.max_redeem_per_team) || 0;
  if (maxPerTeam > 0) {
    if (qty > maxPerTeam) {
      throw new Error(`Kuantitas melebihi batas maksimal penukaran (${maxPerTeam} item per tim).`);
    }

    const [redeemedResult] = await db
      .select({
        totalQuantity: sql`COALESCE(SUM(${schema.Redemption.quantity}), 0)`.as("totalQuantity"),
      })
      .from(schema.Redemption)
      .where(
        and(
          eq(schema.Redemption.registration_id, currentRegistration.registration_id),
          eq(schema.Redemption.product_id, productId)
        )
      );

    const alreadyRedeemed = Number(redeemedResult?.totalQuantity || 0);
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

    // 3. Validasi batas kuota tim di dalam transaksi untuk mencegah race condition
    if (maxPerTeam > 0) {
      const [txRedeemed] = await tx
        .select({
          totalQuantity: sql`COALESCE(SUM(${schema.Redemption.quantity}), 0)`.as("totalQuantity"),
        })
        .from(schema.Redemption)
        .where(
          and(
            eq(schema.Redemption.registration_id, currentRegistration.registration_id),
            eq(schema.Redemption.product_id, productId)
          )
        );
      const currentAlreadyRedeemed = Number(txRedeemed?.totalQuantity || 0);
      if (currentAlreadyRedeemed + qty > maxPerTeam) {
        throw new Error(`Batas maksimal penukaran produk (${maxPerTeam} item per tim) terlampaui.`);
      }
    }

    // 4. Catat riwayat penukaran hadiah beserta points_used, xp_used, dan quantity
    await tx
      .insert(schema.Redemption)
      .values({
        redemption_id: redemptionId,
        registration_id: currentRegistration.registration_id,
        product_id: productId,
        points_used: pointsNeeded,
        xp_used: xpNeeded,
        quantity: qty,
        created_by: userId,
        updated_by: userId,
      });
  });

  return {
    registration_id: currentRegistration.registration_id,
    redemption_id: redemptionId,
    points_used: pointsNeeded,
    xp_used: xpNeeded,
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
      is_single_redeem: Number(updatedProduct.max_redeem_per_team) === 1,
    },
    quantity: qty,
    earned_xp: earnedXp,
  };
};

// Get all redemption history (admin only)
export const getAllRedeemUser = async (filters = {}) => {
  const { page = 1, limit = 10, search, user_id, registration_id, product_id, category_id } = filters;
  const skip = (page - 1) * Number(limit);

  const conditions = [];

  if (registration_id) conditions.push(eq(schema.Redemption.registration_id, registration_id));
  if (user_id) conditions.push(eq(schema.Registration.user_id, user_id));
  if (product_id) conditions.push(eq(schema.Redemption.product_id, product_id));
  if (category_id) {
    if (category_id.toLowerCase() === "global") {
      conditions.push(isNull(schema.product.category_id));
    } else if (category_id.toLowerCase() !== "all") {
      conditions.push(
        or(
          eq(schema.product.category_id, category_id),
          eq(schema.Registration.category_id, category_id)
        )
      );
    }
  }

  if (search) {
    conditions.push(
      or(
        like(schema.User.name, `%${search}%`),
        like(schema.User.email, `%${search}%`),
        like(schema.User.whatsapp_number, `%${search}%`),
        like(schema.Registration.team_name, `%${search}%`),
        like(schema.product.name, `%${search}%`)
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
      .limit(Number(limit))
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

  const redemptions = rows.map((row) => ({
    ...row.Redemption,
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
          is_single_redeem: Number(row.product.max_redeem_per_team) === 1,
          reward_xp: row.product.reward_xp,
        }
      : null,
    created_by_name: row.creator?.name || row.Redemption.created_by || "-",
    updated_by_name: row.updater?.name || row.Redemption.updated_by || "-",
  }));

  const total = Number(countResult?.count || 0);

  return {
    redemptions,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

// Get user's own redemption history
export const getMyRedeem = async (userId, filters = {}) => {
  const { page = 1, limit = 10, search, product_id, category_id, registration_id } = filters;
  const skip = (page - 1) * Number(limit);

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

  if (search) {
    conditions.push(like(schema.product.name, `%${search}%`));
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
      .limit(Number(limit))
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

  const redemptions = rows.map((row) => ({
    ...row.Redemption,
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
          is_single_redeem: Number(row.product.max_redeem_per_team) === 1,
          reward_xp: row.product.reward_xp,
        }
      : null,
  }));

  const total = Number(countResult?.count || 0);

  return {
    redemptions,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};