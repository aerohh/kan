import { relations } from "drizzle-orm";
import {
  bigint,
  bigserial,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { boards } from "./boards";
import { imports } from "./imports";
import { propertyGroups } from "./property-groups";
import { users } from "./users";

export const propertyOptions = pgTable("property_option", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  publicId: varchar("publicId", { length: 12 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  colourCode: varchar("colourCode", { length: 12 }),
  index: integer("index").notNull().default(0),
  groupId: bigint("groupId", { mode: "number" })
    .notNull()
    .references(() => propertyGroups.id, { onDelete: "cascade" }),
  boardId: bigint("boardId", { mode: "number" })
    .notNull()
    .references(() => boards.id, { onDelete: "cascade" }),
  createdBy: uuid("createdBy").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt"),
  deletedAt: timestamp("deletedAt"),
  deletedBy: uuid("deletedBy").references(() => users.id, {
    onDelete: "set null",
  }),
  importId: bigint("importId", { mode: "number" }).references(
    () => imports.id,
  ),
}).enableRLS();

export const propertyOptionsRelations = relations(
  propertyOptions,
  ({ one }) => ({
    group: one(propertyGroups, {
      fields: [propertyOptions.groupId],
      references: [propertyGroups.id],
    }),
    board: one(boards, {
      fields: [propertyOptions.boardId],
      references: [boards.id],
    }),
    createdBy: one(users, {
      fields: [propertyOptions.createdBy],
      references: [users.id],
      relationName: "propertyOptionsCreatedByUser",
    }),
    deletedBy: one(users, {
      fields: [propertyOptions.deletedBy],
      references: [users.id],
      relationName: "propertyOptionsDeletedByUser",
    }),
    import: one(imports, {
      fields: [propertyOptions.importId],
      references: [imports.id],
      relationName: "propertyOptionsImport",
    }),
  }),
);
