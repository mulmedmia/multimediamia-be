CREATE TYPE "public"."MissionStatus" AS ENUM('ACTIVE', 'EXPIRED', 'DRAFT');--> statement-breakpoint
CREATE TYPE "public"."MissionSubmissionStatus" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "Mission" (
	"mission_id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"deadline" timestamp NOT NULL,
	"min_xp" integer NOT NULL,
	"max_xp" integer NOT NULL,
	"min_diamond" integer NOT NULL,
	"max_diamond" integer NOT NULL,
	"google_docs_url" text NOT NULL,
	"status" "MissionStatus" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "MissionSubmission" (
	"submission_id" text PRIMARY KEY NOT NULL,
	"mission_id" text NOT NULL,
	"user_id" text NOT NULL,
	"submission_url" text NOT NULL,
	"notes" text,
	"status" "MissionSubmissionStatus" DEFAULT 'PENDING' NOT NULL,
	"awarded_xp" integer,
	"awarded_diamond" integer,
	"admin_feedback" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "xp" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "MissionSubmission" ADD CONSTRAINT "MissionSubmission_mission_id_Mission_mission_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."Mission"("mission_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "MissionSubmission" ADD CONSTRAINT "MissionSubmission_user_id_User_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("users_id") ON DELETE cascade ON UPDATE no action;