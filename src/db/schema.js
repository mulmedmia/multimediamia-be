import { pgTable, text, varchar, boolean, integer, timestamp, doublePrecision, pgEnum, uniqueIndex, index } from "drizzle-orm/pg-core";

// Define Enums (matching PostgreSQL custom types created by Prisma)
export const roleEnum = pgEnum("Role", ["USER", "ADMIN", "JURI", "FINANCE"]);
export const verificationStatusEnum = pgEnum("VerificationStatus", ["VERIFIED", "NOT_VERIFIED"]);
export const teamTypeEnum = pgEnum("TeamType", ["INDIVIDUAL", "GROUP"]);
export const submissionStatusEnum = pgEnum("SubmissionStatus", ["PENDING", "APPROVED", "REJECTED", "REVISION"]);
export const linkTypeEnum = pgEnum("LinkType", [
  "GITHUB",
  "GITHUB_SECONDARY",
  "YOUTUBE",
  "DEPLOYMENT",
  "PROPOSAL",
  "FIGMA",
  "FIGMA_PROTOTYPE",
  "PRESENTATION",
  "ORIGINALITY_STATEMENT",
  "OTHER",
]);
export const missionStatusEnum = pgEnum("MissionStatus", ["ACTIVE", "EXPIRED", "DRAFT"]);
export const missionSubmissionStatusEnum = pgEnum("MissionSubmissionStatus", ["PENDING", "APPROVED", "REJECTED"]);
export const referralStatusEnum = pgEnum("ReferralStatus", ["PENDING", "APPROVED", "REJECTED"]);

// User Model Table
export const User = pgTable("User", {
  users_id: text("users_id").primaryKey(),
  name: text("name").notNull(),
  nim: text("nim").unique(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  role: roleEnum("role").default("USER").notNull(),
  is_verified: boolean("is_verified").default(false).notNull(),
  whatsapp_number: text("whatsapp_number"),
  created_by: text("created_by"),
  updated_by: text("updated_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Category Model Table
export const Category = pgTable("Category", {
  category_id: text("category_id").primaryKey(),
  slug: text("slug").notNull(),
  user_id: text("user_id").notNull().references(() => User.users_id),
  name: text("name").notNull(),
  organizer: text("organizer").notNull(),
  description: text("description").notNull(),
  deadline: timestamp("deadline"),
  preliminary_deadline: timestamp("preliminary_deadline"),
  final_deadline: timestamp("final_deadline"),
  batch_1_start: timestamp("batch_1_start"),
  batch_1_end: timestamp("batch_1_end"),
  batch_2_start: timestamp("batch_2_start"),
  batch_2_end: timestamp("batch_2_end"),
  is_submission_open: boolean("is_submission_open").default(true).notNull(),
  allow_revision: boolean("allow_revision").default(false).notNull(),
  is_show_it_open: boolean("is_show_it_open").default(false).notNull(),
  image: text("image").notNull(),
  file_url: text("file_url"),
  whatsapp_group_url: text("whatsapp_group_url"),
  team_type: teamTypeEnum("team_type").default("INDIVIDUAL").notNull(),
  status: verificationStatusEnum("status").notNull(),
  created_by: text("created_by"),
  updated_by: text("updated_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Registration Model Table
export const Registration = pgTable(
  "Registration",
  {
    registration_id: text("registration_id").primaryKey(),
    user_id: text("user_id").notNull().references(() => User.users_id),
    category_id: text("category_id").notNull().references(() => Category.category_id),
    file_url: text("file_url").notNull(),
    team_name: text("team_name"),
    team_members: text("team_members"),
    is_verified: boolean("is_verified").notNull(),
    feedback: text("feedback"),
    diamond: integer("diamond").default(0).notNull(),
    xp: integer("xp").default(0).notNull(),
    referral_code: text("referral_code"),
    is_verified_finance: boolean("is_verified_finance").default(false).notNull(),
    verified_finance_at: timestamp("verified_finance_at"),
    verified_finance_by: text("verified_finance_by").references(() => User.users_id),
    finance_notes: text("finance_notes"),
    created_by: text("created_by"),
    updated_by: text("updated_by"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_registration_category_team_name_unique").on(
      table.category_id,
      table.team_name
    ),
    uniqueIndex("idx_registration_referral_code_unique").on(table.referral_code),
    index("idx_registration_leaderboard").on(
      table.category_id,
      table.is_verified,
      table.xp.desc(),
      table.diamond.desc()
    ),
    index("idx_registration_is_verified_finance").on(table.is_verified_finance),
  ]
);

// Submission Model Table
export const Submission = pgTable(
  "Submission",
  {
    submission_id: text("submission_id").primaryKey(),
    registration_id: text("registration_id")
      .notNull()
      .references(() => Registration.registration_id, { onDelete: "cascade" }),
    project_name: text("project_name").notNull(),
    description: text("description").notNull(),
    flow_application: text("flow_application").notNull(),
    thumbnail_url: text("thumbnail_url"),
    status: submissionStatusEnum("status").default("PENDING").notNull(),
    is_verified: boolean("is_verified").default(false).notNull(),
    created_by: text("created_by"),
    updated_by: text("updated_by"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_submission_show_it").on(table.status, table.is_verified, table.created_at.desc()),
    index("idx_submission_registration_id").on(table.registration_id),
    uniqueIndex("idx_submission_registration_id_unique").on(table.registration_id),
  ]
);

// SubmissionLink Model Table
export const SubmissionLink = pgTable(
  "SubmissionLink",
  {
    link_id: text("link_id").primaryKey(),
    submission_id: text("submission_id").notNull().references(() => Submission.submission_id, { onDelete: "cascade" }),
    link_type: linkTypeEnum("link_type").notNull(),
    url: text("url").notNull(),
    description: text("description"),
    created_by: text("created_by"),
    updated_by: text("updated_by"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_submission_link_submission_id").on(table.submission_id),
  ]
);

// OTP Model Table
export const OTP = pgTable(
  "OTP",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    code: text("code").notNull(),
    expires_at: timestamp("expires_at").notNull(),
    created_by: text("created_by"),
    updated_by: text("updated_by"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_otp_email_created_at").on(table.email, table.created_at.desc()),
  ]
);

// product Model Table (Note: lowercased in Prisma schema)
export const product = pgTable("product", {
  product_id: text("product_id").primaryKey(),
  category_id: text("category_id").references(() => Category.category_id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: doublePrecision("price").notNull(),
  image_url: text("image_url").notNull(),
  stock: integer("stock").default(0).notNull(),
  reward_xp: integer("reward_xp").default(0).notNull(),
  is_unlimited_stock: boolean("is_unlimited_stock").default(false).notNull(),
  is_single_redeem: boolean("is_single_redeem").default(false).notNull(),
  is_active: boolean("is_active").default(true).notNull(),
  created_by: text("created_by"),
  updated_by: text("updated_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Redemption Model Table
export const Redemption = pgTable("Redemption", {
  redemption_id: text("redemption_id").primaryKey(),
  user_id: text("user_id").notNull().references(() => User.users_id),
  product_id: text("product_id").notNull().references(() => product.product_id),
  points_used: integer("points_used").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  created_by: text("created_by"),
  updated_by: text("updated_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Juri Model Table
export const Juri = pgTable("Juri", {
  juri_id: text("juri_id").primaryKey(),
  users_id: text("users_id")
    .notNull()
    .unique()
    .references(() => User.users_id, { onDelete: "cascade" }),
  category_id: text("category_id")
    .notNull()
    .references(() => Category.category_id, { onDelete: "cascade" }),
  created_by: text("created_by"),
  updated_by: text("updated_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Mission Model Table
export const Mission = pgTable("Mission", {
  mission_id: text("mission_id").primaryKey(),
  category_id: text("category_id").references(() => Category.category_id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  deadline: timestamp("deadline").notNull(),
  min_xp: integer("min_xp").notNull(),
  max_xp: integer("max_xp").notNull(),
  min_diamond: integer("min_diamond").notNull(),
  max_diamond: integer("max_diamond").notNull(),
  google_docs_url: text("google_docs_url").notNull(),
  status: missionStatusEnum("status").default("ACTIVE").notNull(),
  created_by: text("created_by"),
  updated_by: text("updated_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// MissionSubmission Model Table
export const MissionSubmission = pgTable("MissionSubmission", {
  submission_id: text("submission_id").primaryKey(),
  mission_id: text("mission_id").notNull().references(() => Mission.mission_id, { onDelete: "cascade" }),
  user_id: text("user_id").notNull().references(() => User.users_id, { onDelete: "cascade" }),
  registration_id: text("registration_id").references(() => Registration.registration_id, { onDelete: "cascade" }),
  submission_url: text("submission_url").notNull(),
  notes: text("notes"),
  status: missionSubmissionStatusEnum("status").default("PENDING").notNull(),
  awarded_xp: integer("awarded_xp"),
  awarded_diamond: integer("awarded_diamond"),
  admin_feedback: text("admin_feedback"),
  reviewed_at: timestamp("reviewed_at"),
  created_by: text("created_by"),
  updated_by: text("updated_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// AppSetting Model Table
export const AppSetting = pgTable("AppSetting", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  description: text("description"),
  created_by: text("created_by"),
  updated_by: text("updated_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// ReferralLog Model Table
export const ReferralLog = pgTable(
  "ReferralLog",
  {
    referral_log_id: text("referral_log_id").primaryKey(),
    referral_code: text("referral_code").notNull(),
    referrer_registration_id: text("referrer_registration_id")
      .notNull()
      .references(() => Registration.registration_id, { onDelete: "cascade" }),
    referee_registration_id: text("referee_registration_id")
      .notNull()
      .references(() => Registration.registration_id, { onDelete: "cascade" }),
    referrer_xp: integer("referrer_xp").default(250).notNull(),
    referee_xp: integer("referee_xp").default(100).notNull(),
    status: referralStatusEnum("status").default("PENDING").notNull(),
    verified_at: timestamp("verified_at"),
    verified_by: text("verified_by").references(() => User.users_id),
    admin_notes: text("admin_notes"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_referral_log_status").on(table.status),
    index("idx_referral_log_code").on(table.referral_code),
    index("idx_referral_log_referrer").on(table.referrer_registration_id),
    index("idx_referral_log_referee").on(table.referee_registration_id),
    uniqueIndex("idx_referral_log_referee_unique").on(table.referee_registration_id),
  ]
);

