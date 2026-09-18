CREATE TABLE "Juri" (
	"juri_id" text PRIMARY KEY NOT NULL,
	"users_id" text NOT NULL,
	"category_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Juri_users_id_unique" UNIQUE("users_id")
);
--> statement-breakpoint
ALTER TABLE "Juri" ADD CONSTRAINT "Juri_users_id_User_users_id_fk" FOREIGN KEY ("users_id") REFERENCES "public"."User"("users_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Juri" ADD CONSTRAINT "Juri_category_id_Category_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."Category"("category_id") ON DELETE cascade ON UPDATE no action;