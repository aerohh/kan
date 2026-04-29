import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { cardsToProperties, propertyOptions } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

export const create = async (
  db: dbClient,
  input: {
    name: string;
    colourCode?: string;
    groupId: number;
    boardId: number;
    createdBy: string;
    cardId?: number;
    importId?: number;
  },
) => {
  return db.transaction(async (tx) => {
    const last = await tx.query.propertyOptions.findFirst({
      columns: { index: true },
      where: and(
        eq(propertyOptions.groupId, input.groupId),
        isNull(propertyOptions.deletedAt),
      ),
      orderBy: [desc(propertyOptions.index)],
    });
    const index = last ? last.index + 1 : 0;

    const [result] = await tx
      .insert(propertyOptions)
      .values({
        publicId: generateUID(),
        name: input.name,
        colourCode: input.colourCode,
        groupId: input.groupId,
        boardId: input.boardId,
        index,
        createdBy: input.createdBy,
        importId: input.importId,
      })
      .returning({
        id: propertyOptions.id,
        publicId: propertyOptions.publicId,
        name: propertyOptions.name,
        colourCode: propertyOptions.colourCode,
        groupId: propertyOptions.groupId,
      });

    if (input.cardId && result) {
      await tx.insert(cardsToProperties).values({
        cardId: input.cardId,
        optionId: result.id,
      });
    }

    return result;
  });
};

export const bulkCreate = async (
  db: dbClient,
  input: {
    publicId: string;
    name: string;
    colourCode?: string;
    groupId: number;
    boardId: number;
    createdBy: string;
    index: number;
    importId?: number;
  }[],
) => {
  if (input.length === 0) return [];

  const results = await db
    .insert(propertyOptions)
    .values(input)
    .returning({
      id: propertyOptions.id,
      publicId: propertyOptions.publicId,
    });

  return results;
};

export const getByPublicId = async (db: dbClient, publicId: string) => {
  return db.query.propertyOptions.findFirst({
    columns: {
      id: true,
      publicId: true,
      name: true,
      colourCode: true,
      groupId: true,
      boardId: true,
      index: true,
    },
    where: and(
      eq(propertyOptions.publicId, publicId),
      isNull(propertyOptions.deletedAt),
    ),
  });
};

export const getAllByPublicIds = (db: dbClient, publicIds: string[]) => {
  return db.query.propertyOptions.findMany({
    columns: { id: true, groupId: true },
    where: inArray(propertyOptions.publicId, publicIds),
  });
};

export const getAllByGroupId = async (db: dbClient, groupId: number) => {
  return db.query.propertyOptions.findMany({
    columns: {
      id: true,
      publicId: true,
      name: true,
      colourCode: true,
      index: true,
    },
    where: and(
      eq(propertyOptions.groupId, groupId),
      isNull(propertyOptions.deletedAt),
    ),
    orderBy: [propertyOptions.index],
  });
};

export const getAllByBoardId = async (db: dbClient, boardId: number) => {
  return db.query.propertyOptions.findMany({
    columns: {
      id: true,
      publicId: true,
      name: true,
      colourCode: true,
      groupId: true,
      index: true,
    },
    where: and(
      eq(propertyOptions.boardId, boardId),
      isNull(propertyOptions.deletedAt),
    ),
    orderBy: [propertyOptions.index],
  });
};

export const update = async (
  db: dbClient,
  input: {
    publicId: string;
    name?: string;
    colourCode?: string;
  },
) => {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) updates.name = input.name;
  if (input.colourCode !== undefined) updates.colourCode = input.colourCode;

  const [result] = await db
    .update(propertyOptions)
    .set(updates)
    .where(eq(propertyOptions.publicId, input.publicId))
    .returning({
      id: propertyOptions.id,
      publicId: propertyOptions.publicId,
      name: propertyOptions.name,
      colourCode: propertyOptions.colourCode,
    });

  return result;
};

export const softDelete = async (
  db: dbClient,
  args: {
    publicId: string;
    deletedBy: string;
  },
) => {
  return db.transaction(async (tx) => {
    const [option] = await tx
      .update(propertyOptions)
      .set({
        deletedAt: new Date(),
        deletedBy: args.deletedBy,
      })
      .where(
        and(
          eq(propertyOptions.publicId, args.publicId),
          isNull(propertyOptions.deletedAt),
        ),
      )
      .returning({ id: propertyOptions.id });

    if (option) {
      await tx
        .delete(cardsToProperties)
        .where(eq(cardsToProperties.optionId, option.id));
    }

    return option;
  });
};

export const createCardPropertyRelation = async (
  db: dbClient,
  { cardId, optionId }: { cardId: number; optionId: number },
) => {
  await db.insert(cardsToProperties).values({ cardId, optionId });
};

export const bulkCreateCardPropertyRelations = async (
  db: dbClient,
  relations: { cardId: number; optionId: number }[],
) => {
  if (relations.length === 0) return;
  await db.insert(cardsToProperties).values(relations);
};

export const getCardPropertyRelation = async (
  db: dbClient,
  { cardId, optionId }: { cardId: number; optionId: number },
) => {
  return db.query.cardsToProperties.findFirst({
    where: and(
      eq(cardsToProperties.cardId, cardId),
      eq(cardsToProperties.optionId, optionId),
    ),
  });
};

export const hardDeleteCardPropertyRelation = async (
  db: dbClient,
  { cardId, optionId }: { cardId: number; optionId: number },
) => {
  await db
    .delete(cardsToProperties)
    .where(
      and(
        eq(cardsToProperties.cardId, cardId),
        eq(cardsToProperties.optionId, optionId),
      ),
    );
};

export const hardDeleteAllCardPropertyRelations = async (
  db: dbClient,
  optionId: number,
) => {
  await db
    .delete(cardsToProperties)
    .where(eq(cardsToProperties.optionId, optionId));
};

export const getCardOptionIds = async (db: dbClient, cardId: number) => {
  const rows = await db
    .select({ optionId: cardsToProperties.optionId })
    .from(cardsToProperties)
    .where(eq(cardsToProperties.cardId, cardId));

  return rows.map((r) => r.optionId);
};

export const syncCardProperties = async (
  db: dbClient,
  { cardId, optionIds }: { cardId: number; optionIds: number[] },
) => {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({ optionId: cardsToProperties.optionId })
      .from(cardsToProperties)
      .where(eq(cardsToProperties.cardId, cardId));
    const current = rows.map((r) => r.optionId);

    const toAdd = optionIds.filter((id) => !current.includes(id));
    const toRemove = current.filter((id) => !optionIds.includes(id));

    if (toAdd.length > 0) {
      await tx
        .insert(cardsToProperties)
        .values(toAdd.map((optionId) => ({ cardId, optionId })));
    }

    for (const optionId of toRemove) {
      await tx
        .delete(cardsToProperties)
        .where(
          and(
            eq(cardsToProperties.cardId, cardId),
            eq(cardsToProperties.optionId, optionId),
          ),
        );
    }
  });
};

export const getWorkspaceAndOptionIdByPublicId = async (
  db: dbClient,
  publicId: string,
) => {
  const result = await db.query.propertyOptions.findFirst({
    columns: { id: true },
    where: eq(propertyOptions.publicId, publicId),
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
