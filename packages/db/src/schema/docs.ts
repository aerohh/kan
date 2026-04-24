import { relations } from "drizzle-orm";
import {
  bigint,
  bigserial,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

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

export const docsRelations = relations(docs, ({ one }) => ({
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
}));
