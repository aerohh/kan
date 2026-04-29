import { relations } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { boards } from "./boards";
import { imports } from "./imports";
import { propertyOptions } from "./property-options";
import { users } from "./users";

export const propertyGroupTypes = ["single-select", "multi-select"] as const;
export type PropertyGroupType = (typeof propertyGroupTypes)[number];
export const propertyGroupTypeEnum = pgEnum(
  "property_group_type",
  propertyGroupTypes,
);

export const propertyGroups = pgTable("property_group", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  publicId: varchar("publicId", { length: 12 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  type: propertyGroupTypeEnum("type").notNull().default("single-select"),
  index: integer("index").notNull().default(0),
  showOnCard: boolean("showOnCard").notNull().default(true),
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

export const propertyGroupsRelations = relations(
  propertyGroups,
  ({ one, many }) => ({
    board: one(boards, {
      fields: [propertyGroups.boardId],
      references: [boards.id],
    }),
    createdBy: one(users, {
      fields: [propertyGroups.createdBy],
      references: [users.id],
      relationName: "propertyGroupsCreatedByUser",
    }),
    deletedBy: one(users, {
      fields: [propertyGroups.deletedBy],
      references: [users.id],
      relationName: "propertyGroupsDeletedByUser",
    }),
    options: many(propertyOptions),
    import: one(imports, {
      fields: [propertyGroups.importId],
      references: [imports.id],
      relationName: "propertyGroupsImport",
    }),
  }),
);
