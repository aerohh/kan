CREATE TABLE IF NOT EXISTS "_doc_labels" (
	"docId" bigint NOT NULL,
	"labelId" bigint NOT NULL,
	CONSTRAINT "_doc_labels_docId_labelId_pk" PRIMARY KEY("docId","labelId")
);
--> statement-breakpoint
ALTER TABLE "_doc_labels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "_doc_labels" ADD CONSTRAINT "_doc_labels_docId_doc_id_fk" FOREIGN KEY ("docId") REFERENCES "public"."doc"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "_doc_labels" ADD CONSTRAINT "_doc_labels_labelId_label_id_fk" FOREIGN KEY ("labelId") REFERENCES "public"."label"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
