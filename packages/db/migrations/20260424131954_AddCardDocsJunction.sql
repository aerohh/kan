DO $$ BEGIN
  ALTER TYPE "public"."card_activity_type" ADD VALUE 'card.updated.doc.attached';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE "public"."card_activity_type" ADD VALUE 'card.updated.doc.detached';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "_card_docs" (
	"cardId" bigint NOT NULL,
	"docId" bigint NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "_card_docs_cardId_docId_pk" PRIMARY KEY("cardId","docId")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "_card_docs" ADD CONSTRAINT "_card_docs_cardId_card_id_fk" FOREIGN KEY ("cardId") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "_card_docs" ADD CONSTRAINT "_card_docs_docId_doc_id_fk" FOREIGN KEY ("docId") REFERENCES "public"."doc"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
