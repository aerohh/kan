import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as docRepo from "@kan/db/repository/doc.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  docCreateResponseSchema,
  docUpdateResponseSchema,
  docDetailSchema,
  docListItemSchema,
} from "../schemas";
import { assertUserInWorkspace } from "../utils/auth";
import { createLogger } from "@kan/logger";

const log = createLogger("doc-router");

export const docRouter = createTRPCRouter({
  create: protectedProcedure
    .meta({
      openapi: {
        summary: "Create a doc",
        method: "POST",
        path: "/docs",
        description: "Creates a new doc in a workspace",
        tags: ["Docs"],
        protect: true,
      },
    })
    .input(
      z.object({
        workspacePublicId: z.string().min(12),
        title: z.string().optional(),
        content: z.array(z.unknown()).optional(),
      }),
    )
    .output(docCreateResponseSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const workspace = await workspaceRepo.getByPublicId(
        ctx.db,
        input.workspacePublicId,
      );

      if (!workspace)
        throw new TRPCError({
          message: `Workspace with public ID ${input.workspacePublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, workspace.id);

      const result = await docRepo.create(ctx.db, {
        title: input.title,
        content: input.content,
        createdBy: userId,
        workspaceId: workspace.id,
      });

      if (!result)
        throw new TRPCError({
          message: `Failed to create doc`,
          code: "INTERNAL_SERVER_ERROR",
        });

      return {
        publicId: result.publicId,
        title: result.title,
      };
    }),

  update: protectedProcedure
    .meta({
      openapi: {
        summary: "Update a doc",
        method: "PUT",
        path: "/docs/{docPublicId}",
        description: "Updates a doc by its public ID",
        tags: ["Docs"],
        protect: true,
      },
    })
    .input(
      z.object({
        docPublicId: z.string().min(12),
        title: z.string().optional(),
        content: z.array(z.unknown()).optional(),
      }),
    )
    .output(docUpdateResponseSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const doc = await docRepo.getByPublicId(ctx.db, input.docPublicId);

      if (!doc)
        throw new TRPCError({
          message: `Doc with public ID ${input.docPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, doc.workspaceId);

      const result = await docRepo.update(
        ctx.db,
        {
          title: input.title,
          content: input.content,
        },
        { docPublicId: input.docPublicId },
      );

      if (!result)
        throw new TRPCError({
          message: `Failed to update doc`,
          code: "INTERNAL_SERVER_ERROR",
        });

      return {
        publicId: result.publicId,
        title: result.title,
        updatedAt: result.updatedAt,
      };
    }),

  byId: protectedProcedure
    .meta({
      openapi: {
        summary: "Get a doc",
        method: "GET",
        path: "/docs/{docPublicId}",
        description: "Gets a doc by its public ID",
        tags: ["Docs"],
        protect: true,
      },
    })
    .input(
      z.object({
        docPublicId: z.string().min(12),
      }),
    )
    .output(docDetailSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const doc = await docRepo.getByPublicId(ctx.db, input.docPublicId);

      if (!doc)
        throw new TRPCError({
          message: `Doc with public ID ${input.docPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, doc.workspaceId);

      return {
        publicId: doc.publicId,
        title: doc.title,
        content: doc.content,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    }),

  list: protectedProcedure
    .meta({
      openapi: {
        summary: "List docs",
        method: "GET",
        path: "/docs",
        description: "Lists all docs in a workspace",
        tags: ["Docs"],
        protect: true,
      },
    })
    .input(
      z.object({
        workspacePublicId: z.string().min(12),
      }),
    )
    .output(z.array(docListItemSchema))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const workspace = await workspaceRepo.getByPublicId(
        ctx.db,
        input.workspacePublicId,
      );

      if (!workspace)
        throw new TRPCError({
          message: `Workspace with public ID ${input.workspacePublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, workspace.id);

      const docs = await docRepo.getByWorkspaceId(ctx.db, workspace.id);

      return docs.map((d) => ({
        publicId: d.publicId,
        title: d.title,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }));
    }),

  delete: protectedProcedure
    .meta({
      openapi: {
        summary: "Delete a doc",
        method: "DELETE",
        path: "/docs/{docPublicId}",
        description: "Soft-deletes a doc by its public ID",
        tags: ["Docs"],
        protect: true,
      },
    })
    .input(
      z.object({
        docPublicId: z.string().min(12),
      }),
    )
    .output(z.object({ publicId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const doc = await docRepo.getByPublicId(ctx.db, input.docPublicId);

      if (!doc)
        throw new TRPCError({
          message: `Doc with public ID ${input.docPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, doc.workspaceId);

      const result = await docRepo.softDelete(ctx.db, {
        docPublicId: input.docPublicId,
        deletedBy: userId,
      });

      if (!result)
        throw new TRPCError({
          message: `Failed to delete doc`,
          code: "INTERNAL_SERVER_ERROR",
        });

      return { publicId: result.publicId };
    }),
});
