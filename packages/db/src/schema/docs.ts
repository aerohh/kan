import { relations } from "drizzle-orm";
import {
  bigint,
  bigserial,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { labels } from "./labels";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const docs = pgTable(
  "doc",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    publicId: varchar("publicId", { length: 12 }).notNull().unique(),
    title: text("title").notNull().default(""),
    content: jsonb("content").$type<unknown[] | null>(),
    createdBy: uuid("createdBy").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt"),
    deletedAt: timestamp("deletedAt"),
    deletedBy: uuid("deletedBy").references(() => users.id, {
      onDelete: "set null",
    }),
    workspaceId: bigint("workspaceId", { mode: "number" })
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("doc_workspace_idx").on(table.workspaceId),
    index("doc_created_by_idx").on(table.createdBy),
    index("doc_deleted_at_idx").on(table.deletedAt),
  ],
).enableRLS();

export const docsRelations = relations(docs, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [docs.createdBy],
    references: [users.id],
    relationName: "docCreatedByUser",
  }),
  deletedBy: one(users, {
    fields: [docs.deletedBy],
    references: [users.id],
    relationName: "docDeletedByUser",
  }),
  workspace: one(workspaces, {
    fields: [docs.workspaceId],
    references: [workspaces.id],
    relationName: "docWorkspace",
  }),
  labels: many(docsToLabels),
}));

export const docsToLabels = pgTable(
  "_doc_labels",
  {
    docId: bigint("docId", { mode: "number" })
      .notNull()
      .references(() => docs.id, { onDelete: "cascade" }),
    labelId: bigint("labelId", { mode: "number" })
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.docId, t.labelId] })],
).enableRLS();

export const docsToLabelsRelations = relations(docsToLabels, ({ one }) => ({
  doc: one(docs, {
    fields: [docsToLabels.docId],
    references: [docs.id],
    relationName: "docToLabelsDoc",
  }),
  label: one(labels, {
    fields: [docsToLabels.labelId],
    references: [labels.id],
    relationName: "docToLabelsLabel",
  }),
}));
