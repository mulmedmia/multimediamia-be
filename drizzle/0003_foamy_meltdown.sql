ALTER TYPE "public"."LinkType" ADD VALUE 'GITHUB_SECONDARY' BEFORE 'YOUTUBE';--> statement-breakpoint
ALTER TYPE "public"."LinkType" ADD VALUE 'DEPLOYMENT' BEFORE 'OTHER';--> statement-breakpoint
ALTER TYPE "public"."LinkType" ADD VALUE 'PROPOSAL' BEFORE 'OTHER';--> statement-breakpoint
ALTER TYPE "public"."LinkType" ADD VALUE 'FIGMA' BEFORE 'OTHER';--> statement-breakpoint
ALTER TYPE "public"."LinkType" ADD VALUE 'FIGMA_PROTOTYPE' BEFORE 'OTHER';--> statement-breakpoint
CREATE TABLE "AppSetting" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Category" ALTER COLUMN "deadline" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Category" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "Category" ADD COLUMN "preliminary_deadline" timestamp;--> statement-breakpoint
ALTER TABLE "Category" ADD COLUMN "final_deadline" timestamp;--> statement-breakpoint
ALTER TABLE "Category" ADD COLUMN "batch_1_start" timestamp;--> statement-breakpoint
ALTER TABLE "Category" ADD COLUMN "batch_1_end" timestamp;--> statement-breakpoint
ALTER TABLE "Category" ADD COLUMN "batch_2_start" timestamp;--> statement-breakpoint
ALTER TABLE "Category" ADD COLUMN "batch_2_end" timestamp;--> statement-breakpoint
ALTER TABLE "Category" ADD COLUMN "is_submission_open" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "Category" ADD COLUMN "allow_revision" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "Category" ADD COLUMN "is_show_it_open" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "Category" ADD COLUMN "whatsapp_group_url" text;--> statement-breakpoint
ALTER TABLE "Category" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "Category" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "Juri" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "Juri" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "Mission" ADD COLUMN "category_id" text;--> statement-breakpoint
ALTER TABLE "Mission" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "Mission" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "MissionSubmission" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "MissionSubmission" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "OTP" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "OTP" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "OTP" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "Redemption" ADD COLUMN "quantity" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "Redemption" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "Redemption" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "Redemption" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "Registration" ADD COLUMN "diamond" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Registration" ADD COLUMN "xp" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Registration" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "Registration" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "Submission" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "Submission" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "SubmissionLink" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "SubmissionLink" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "category_id" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "reward_xp" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "is_unlimited_stock" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "is_single_redeem" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_category_id_Category_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."Category"("category_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_Category_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."Category"("category_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_otp_email_created_at" ON "OTP" USING btree ("email","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_registration_category_team_name_unique" ON "Registration" USING btree ("category_id","team_name");--> statement-breakpoint
CREATE INDEX "idx_registration_leaderboard" ON "Registration" USING btree ("category_id","is_verified","xp" DESC NULLS LAST,"diamond" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_submission_show_it" ON "Submission" USING btree ("status","is_verified","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_submission_category_id" ON "Submission" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_submission_user_id" ON "Submission" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_submission_link_submission_id" ON "SubmissionLink" USING btree ("submission_id");--> statement-breakpoint
ALTER TABLE "Category" DROP COLUMN "category_name";--> statement-breakpoint
ALTER TABLE "Category" DROP COLUMN "startDate";--> statement-breakpoint
ALTER TABLE "Category" DROP COLUMN "endDate";--> statement-breakpoint
ALTER TABLE "Category" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "Submission" DROP COLUMN "score";--> statement-breakpoint
ALTER TABLE "Submission" DROP COLUMN "feedback";--> statement-breakpoint
ALTER TABLE "User" DROP COLUMN "points";--> statement-breakpoint
ALTER TABLE "User" DROP COLUMN "xp";