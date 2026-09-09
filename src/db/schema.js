import { pgTable, text, varchar, boolean, integer, timestamp, doublePrecision, pgEnum } from "drizzle-orm/pg-core";

// Define Enums (matching PostgreSQL custom types created by Prisma)
export const roleEnum = pgEnum("Role", ["USER", "ADMIN", "JURI"]);
export const verificationStatusEnum = pgEnum("VerificationStatus", ["VERIFIED", "NOT_VERIFIED"]);
export const teamTypeEnum = pgEnum("TeamType", ["INDIVIDUAL", "GROUP"]);
export const submissionStatusEnum = pgEnum("SubmissionStatus", ["PENDING", "APPROVED", "REJECTED", "REVISION"]);
export const linkTypeEnum = pgEnum("LinkType", ["GITHUB", "YOUTUBE", "OTHER"]);

// User Model Table
export const User = pgTable("User", {
  users_id: text("users_id").primaryKey(),
  name: text("name").notNull(),
  nim: text("nim").unique(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  role: roleEnum("role").default("USER").notNull(),
  is_verified: boolean("is_verified").default(false).notNull(),
  points: integer("points").default(0).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Category Model Table
export const Category = pgTable("Category", {
  category_id: text("category_id").primaryKey(),
  category_name: text("category_name").notNull(),
  user_id: text("user_id").notNull().references(() => User.users_id),
  name: text("name").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  organizer: text("organizer").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  deadline: timestamp("deadline").notNull(),
  image: text("image").notNull(),
  file_url: text("file_url"),
  team_type: teamTypeEnum("team_type").default("INDIVIDUAL").notNull(),
  status: verificationStatusEnum("status").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Registration Model Table
export const Registration = pgTable("Registration", {
  registration_id: text("registration_id").primaryKey(),
  user_id: text("user_id").notNull().references(() => User.users_id),
  category_id: text("category_id").notNull().references(() => Category.category_id),
  file_url: text("file_url").notNull(),
  team_name: text("team_name"),
  team_members: text("team_members"),
  is_verified: boolean("is_verified").notNull(),
  feedback: text("feedback"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Submission Model Table
export const Submission = pgTable("Submission", {
  submission_id: text("submission_id").primaryKey(),
  user_id: text("user_id").notNull().references(() => User.users_id),
  category_id: text("category_id").notNull().references(() => Category.category_id),
  team_name: text("team_name").notNull(),
  project_name: text("project_name").notNull(),
  description: text("description").notNull(),
  flow_application: text("flow_application").notNull(),
  score: doublePrecision("score"),
  feedback: text("feedback"),
  status: submissionStatusEnum("status").default("PENDING").notNull(),
  is_verified: boolean("is_verified").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// SubmissionLink Model Table
export const SubmissionLink = pgTable("SubmissionLink", {
  link_id: text("link_id").primaryKey(),
  submission_id: text("submission_id").notNull().references(() => Submission.submission_id, { onDelete: "cascade" }),
  link_type: linkTypeEnum("link_type").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// OTP Model Table
export const OTP = pgTable("OTP", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// product Model Table (Note: lowercased in Prisma schema)
export const product = pgTable("product", {
  product_id: text("product_id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: doublePrecision("price").notNull(),
  image_url: text("image_url").notNull(),
  stock: integer("stock").default(0).notNull(),
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Redemption Model Table
export const Redemption = pgTable("Redemption", {
  redemption_id: text("redemption_id").primaryKey(),
  user_id: text("user_id").notNull().references(() => User.users_id),
  product_id: text("product_id").notNull().references(() => product.product_id),
  points_used: integer("points_used").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
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
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});
