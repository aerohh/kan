CREATE TABLE IF NOT EXISTS "doc" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"publicId" varchar(12) NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"content" jsonb,
	"createdBy" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"deletedAt" timestamp,
	"deletedBy" uuid,
	"workspaceId" bigint NOT NULL,
	CONSTRAINT "doc_publicId_unique" UNIQUE("publicId")
);
--> statement-breakpoint
ALTER TABLE "doc" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doc" ADD CONSTRAINT "doc_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doc" ADD CONSTRAINT "doc_deletedBy_user_id_fk" FOREIGN KEY ("deletedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doc" ADD CONSTRAINT "doc_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doc_workspace_idx" ON "doc" USING btree ("workspaceId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doc_created_by_idx" ON "doc" USING btree ("createdBy");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doc_deleted_at_idx" ON "doc" USING btree ("deletedAt");