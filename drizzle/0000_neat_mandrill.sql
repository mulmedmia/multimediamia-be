CREATE TYPE "public"."LinkType" AS ENUM('GITHUB', 'YOUTUBE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."Role" AS ENUM('USER', 'ADMIN', 'JURI');--> statement-breakpoint
CREATE TYPE "public"."SubmissionStatus" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'REVISION');--> statement-breakpoint
CREATE TYPE "public"."TeamType" AS ENUM('INDIVIDUAL', 'GROUP');--> statement-breakpoint
CREATE TYPE "public"."VerificationStatus" AS ENUM('VERIFIED', 'NOT_VERIFIED');--> statement-breakpoint
CREATE TABLE "Category" (
	"category_id" text PRIMARY KEY NOT NULL,
	"category_name" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp NOT NULL,
	"organizer" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"deadline" timestamp NOT NULL,
	"image" text NOT NULL,
	"file_url" text,
	"team_type" "TeamType" DEFAULT 'INDIVIDUAL' NOT NULL,
	"status" "VerificationStatus" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "OTP" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Redemption" (
	"redemption_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"product_id" text NOT NULL,
	"points_used" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Registration" (
	"registration_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"category_id" text NOT NULL,
	"file_url" text NOT NULL,
	"team_name" text,
	"team_members" text,
	"is_verified" boolean NOT NULL,
	"feedback" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Submission" (
	"submission_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"category_id" text NOT NULL,
	"team_name" text NOT NULL,
	"project_name" text NOT NULL,
	"description" text NOT NULL,
	"flow_application" text NOT NULL,
	"score" double precision,
	"feedback" text,
	"status" "SubmissionStatus" DEFAULT 'PENDING' NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SubmissionLink" (
	"link_id" text PRIMARY KEY NOT NULL,
	"submission_id" text NOT NULL,
	"link_type" "LinkType" NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"users_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"nim" text,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" "Role" DEFAULT 'USER' NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "User_nim_unique" UNIQUE("nim"),
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "product" (
	"product_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price" double precision NOT NULL,
	"image_url" text NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Category" ADD CONSTRAINT "Category_user_id_User_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("users_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_user_id_User_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("users_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_product_id_product_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("product_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_user_id_User_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("users_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_category_id_Category_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."Category"("category_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_user_id_User_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("users_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_category_id_Category_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."Category"("category_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SubmissionLink" ADD CONSTRAINT "SubmissionLink_submission_id_Submission_submission_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."Submission"("submission_id") ON DELETE cascade ON UPDATE no action;