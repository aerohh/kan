import { and, desc, eq, isNull } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { docs } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

export const create = async (
  db: dbClient,
  docInput: {
    title?: string;
    content?: unknown[];
    createdBy: string;
    workspaceId: number;
  },
) => {
  const publicId = generateUID();
  const [result] = await db
    .insert(docs)
    .values({
      publicId,
      title: docInput.title ?? "",
      content: docInput.content ?? null,
      createdBy: docInput.createdBy,
      workspaceId: docInput.workspaceId,
    })
    .returning({
      id: docs.id,
      publicId: docs.publicId,
      title: docs.title,
      content: docs.content,
      createdAt: docs.createdAt,
      updatedAt: docs.updatedAt,
    });

  return result;
};

export const update = async (
  db: dbClient,
  docInput: {
    title?: string;
    content?: unknown[];
  },
  args: {
    docPublicId: string;
  },
) => {
  const [result] = await db
    .update(docs)
    .set({
      ...(docInput.title !== undefined && { title: docInput.title }),
      ...(docInput.content !== undefined && { content: docInput.content }),
      updatedAt: new Date(),
    })
    .where(and(eq(docs.publicId, args.docPublicId), isNull(docs.deletedAt)))
    .returning({
      id: docs.id,
      publicId: docs.publicId,
      title: docs.title,
      content: docs.content,
      updatedAt: docs.updatedAt,
    });

  return result;
};

export const getByPublicId = (db: dbClient, docPublicId: string) => {
  return db.query.docs.findFirst({
    columns: {
      id: true,
      publicId: true,
      title: true,
      content: true,
      createdBy: true,
      workspaceId: true,
      createdAt: true,
      updatedAt: true,
    },
    where: and(eq(docs.publicId, docPublicId), isNull(docs.deletedAt)),
  });
};

export const getByWorkspaceId = (
  db: dbClient,
  workspaceId: number,
) => {
  return db.query.docs.findMany({
    columns: {
      id: true,
      publicId: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
    where: and(eq(docs.workspaceId, workspaceId), isNull(docs.deletedAt)),
    orderBy: [desc(docs.updatedAt)],
  });
};

export const softDelete = async (
  db: dbClient,
  args: {
    docPublicId: string;
    deletedBy: string;
  },
) => {
  const [result] = await db
    .update(docs)
    .set({
      deletedAt: new Date(),
      deletedBy: args.deletedBy,
    })
    .where(and(eq(docs.publicId, args.docPublicId), isNull(docs.deletedAt)))
    .returning({
      id: docs.id,
      publicId: docs.publicId,
    });

  return result;
};
