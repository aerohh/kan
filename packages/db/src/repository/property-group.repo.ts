import { and, count, desc, eq, isNull, sql } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { propertyGroups, propertyOptions } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

export const getCount = async (db: dbClient) => {
  const result = await db
    .select({ count: count() })
    .from(propertyGroups)
    .where(isNull(propertyGroups.deletedAt));

  return result[0]?.count ?? 0;
};

export const create = async (
  db: dbClient,
  input: {
    name: string;
    type: "single-select" | "multi-select";
    boardId: number;
    createdBy: string;
    importId?: number;
  },
) => {
  return db.transaction(async (tx) => {
    const last = await tx.query.propertyGroups.findFirst({
      columns: { index: true },
      where: and(
        eq(propertyGroups.boardId, input.boardId),
        isNull(propertyGroups.deletedAt),
      ),
      orderBy: [desc(propertyGroups.index)],
    });

    const index = last ? last.index + 1 : 0;

    const [result] = await tx
      .insert(propertyGroups)
      .values({
        publicId: generateUID(),
        name: input.name,
        type: input.type,
        boardId: input.boardId,
        createdBy: input.createdBy,
        index,
        importId: input.importId,
      })
      .returning({
        id: propertyGroups.id,
        publicId: propertyGroups.publicId,
        name: propertyGroups.name,
        type: propertyGroups.type,
        boardId: propertyGroups.boardId,
        index: propertyGroups.index,
        showOnCard: propertyGroups.showOnCard,
      });

    return result;
  });
};

export const bulkCreate = async (
  db: dbClient,
  input: {
    publicId: string;
    name: string;
    type: "single-select" | "multi-select";
    boardId: number;
    createdBy: string;
    index: number;
    importId?: number;
  }[],
) => {
  if (input.length === 0) return [];

  const results = await db
    .insert(propertyGroups)
    .values(input)
    .returning({ id: propertyGroups.id, publicId: propertyGroups.publicId });

  return results;
};

export const getByPublicId = async (
  db: dbClient,
  publicId: string,
) => {
  return db.query.propertyGroups.findFirst({
    columns: {
      id: true,
      publicId: true,
      name: true,
      type: true,
      boardId: true,
      index: true,
      showOnCard: true,
    },
    where: eq(propertyGroups.publicId, publicId),
  });
};

export const getAllByBoardId = async (db: dbClient, boardId: number) => {
  return db.query.propertyGroups.findMany({
    columns: {
      id: true,
      publicId: true,
      name: true,
      type: true,
      index: true,
      showOnCard: true,
    },
    where: and(
      eq(propertyGroups.boardId, boardId),
      isNull(propertyGroups.deletedAt),
    ),
    orderBy: [propertyGroups.index],
    with: {
      options: {
        columns: {
          id: true,
          publicId: true,
          name: true,
          colourCode: true,
          index: true,
        },
        where: isNull(propertyOptions.deletedAt),
        orderBy: [propertyOptions.index],
      },
    },
  });
};

export const update = async (
  db: dbClient,
  input: {
    publicId: string;
    name?: string;
    type?: "single-select" | "multi-select";
    showOnCard?: boolean;
  },
) => {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) updates.name = input.name;
  if (input.type !== undefined) updates.type = input.type;
  if (input.showOnCard !== undefined) updates.showOnCard = input.showOnCard;

  const [result] = await db
    .update(propertyGroups)
    .set(updates)
    .where(eq(propertyGroups.publicId, input.publicId))
    .returning({
      id: propertyGroups.id,
      publicId: propertyGroups.publicId,
      name: propertyGroups.name,
      type: propertyGroups.type,
    });

  return result;
};

export const reorder = async (
  db: dbClient,
  args: {
    publicId: string;
    newIndex: number;
  },
) => {
  return db.transaction(async (tx) => {
    const group = await tx.query.propertyGroups.findFirst({
      columns: { id: true, boardId: true, index: true },
      where: eq(propertyGroups.publicId, args.publicId),
    });

    if (!group) throw new Error(`Group not found: ${args.publicId}`);

    await tx.execute(sql`
      UPDATE property_group
      SET index =
        CASE
          WHEN index = ${group.index} AND id = ${group.id} THEN ${args.newIndex}
          WHEN ${group.index} < ${args.newIndex} AND index > ${group.index} AND index <= ${args.newIndex} THEN index - 1
          WHEN ${group.index} > ${args.newIndex} AND index >= ${args.newIndex} AND index < ${group.index} THEN index + 1
          ELSE index
        END
      WHERE "boardId" = ${group.boardId} AND "deletedAt" IS NULL;
    `);

    return { publicId: args.publicId, newIndex: args.newIndex };
  });
};

export const softDelete = async (
  db: dbClient,
  args: {
    publicId: string;
    deletedBy: string;
  },
) => {
  const [result] = await db
    .update(propertyGroups)
    .set({
      deletedAt: new Date(),
      deletedBy: args.deletedBy,
    })
    .where(
      and(
        eq(propertyGroups.publicId, args.publicId),
        isNull(propertyGroups.deletedAt),
      ),
    )
    .returning({ id: propertyGroups.id });

  return result;
};

export const getWorkspaceAndGroupIdByPublicId = async (
  db: dbClient,
  publicId: string,
) => {
  const result = await db.query.propertyGroups.findFirst({
    columns: { id: true },
    where: eq(propertyGroups.publicId, publicId),
    with: {
      board: {
        columns: { workspaceId: true },
      },
    },
  });

  return result
    ? {
        id: result.id,
        workspaceId: result.board.workspaceId,
      }
    : null;
};
