import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { boards } from "@kan/db/schema";
import * as propertyGroupRepo from "@kan/db/repository/property-group.repo";
import * as propertyOptionRepo from "@kan/db/repository/property-option.repo";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertPermission } from "../utils/permissions";

const groupSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  type: z.enum(["single-select", "multi-select"]),
  index: z.number(),
  options: z.array(
    z.object({
      publicId: z.string(),
      name: z.string(),
      colourCode: z.string().nullable(),
      index: z.number(),
    }),
  ),
});

export const propertyGroupRouter = createTRPCRouter({
  list: protectedProcedure
    .meta({
      openapi: {
        summary: "List property groups for a board",
        method: "GET",
        path: "/property-groups",
        description: "Retrieves all property groups and their options for a board",
        tags: ["Property Groups"],
        protect: true,
      },
    })
    .input(z.object({ boardPublicId: z.string().min(12) }))
    .output(z.array(groupSchema))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const board = await ctx.db.query.boards.findFirst({
        columns: { id: true, workspaceId: true },
        where: eq(boards.publicId, input.boardPublicId),
      });

      if (!board)
        throw new TRPCError({
          message: `Board not found`,
          code: "NOT_FOUND",
        });

      await assertPermission(ctx.db, userId, board.workspaceId, "board:view");

      const groups = await propertyGroupRepo.getAllByBoardId(ctx.db, board.id);

      return groups.map((g) => ({
        publicId: g.publicId,
        name: g.name,
        type: g.type,
        index: g.index,
        options: g.options.map((o) => ({
          publicId: o.publicId,
          name: o.name,
          colourCode: o.colourCode,
          index: o.index,
        })),
      }));
    }),

  create: protectedProcedure
    .meta({
      openapi: {
        summary: "Create a property group",
        method: "POST",
        path: "/property-groups",
        description: "Creates a new property group on a board",
        tags: ["Property Groups"],
        protect: true,
      },
    })
    .input(
      z.object({
        name: z.string().min(1).max(255),
        type: z.enum(["single-select", "multi-select"]),
        boardPublicId: z.string().min(12),
      }),
    )
    .output(
      z.object({
        publicId: z.string(),
        name: z.string(),
        type: z.enum(["single-select", "multi-select"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const board = await ctx.db.query.boards.findFirst({
        columns: { id: true, workspaceId: true },
        where: eq(boards.publicId, input.boardPublicId),
      });

      if (!board)
        throw new TRPCError({
          message: `Board not found`,
          code: "NOT_FOUND",
        });

      await assertPermission(ctx.db, userId, board.workspaceId, "board:edit");

      const result = await propertyGroupRepo.create(ctx.db, {
        name: input.name,
        type: input.type,
        boardId: board.id,
        createdBy: userId,
      });

      if (!result)
        throw new TRPCError({
          message: `Failed to create property group`,
          code: "INTERNAL_SERVER_ERROR",
        });

      return {
        publicId: result.publicId,
        name: result.name,
        type: result.type,
      };
    }),

  update: protectedProcedure
    .meta({
      openapi: {
        summary: "Update a property group",
        method: "PUT",
        path: "/property-groups/{groupPublicId}",
        description: "Updates a property group name or type",
        tags: ["Property Groups"],
        protect: true,
      },
    })
    .input(
      z.object({
        groupPublicId: z.string().min(12),
        name: z.string().min(1).max(255).optional(),
        type: z.enum(["single-select", "multi-select"]).optional(),
      }),
    )
    .output(
      z.object({
        publicId: z.string(),
        name: z.string(),
        type: z.enum(["single-select", "multi-select"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const group = await propertyGroupRepo.getWorkspaceAndGroupIdByPublicId(
        ctx.db,
        input.groupPublicId,
      );

      if (!group)
        throw new TRPCError({
          message: `Property group not found`,
          code: "NOT_FOUND",
        });

      await assertPermission(ctx.db, userId, group.workspaceId, "board:edit");

      const result = await propertyGroupRepo.update(ctx.db, {
        publicId: input.groupPublicId,
        name: input.name,
        type: input.type,
      });

      if (!result)
        throw new TRPCError({
          message: `Failed to update property group`,
          code: "INTERNAL_SERVER_ERROR",
        });

      return {
        publicId: result.publicId,
        name: result.name,
        type: result.type,
      };
    }),

  delete: protectedProcedure
    .meta({
      openapi: {
        summary: "Delete a property group",
        method: "DELETE",
        path: "/property-groups/{groupPublicId}",
        description: "Soft deletes a property group and all its options",
        tags: ["Property Groups"],
        protect: true,
      },
    })
    .input(z.object({ groupPublicId: z.string().min(12) }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const group = await propertyGroupRepo.getWorkspaceAndGroupIdByPublicId(
        ctx.db,
        input.groupPublicId,
      );

      if (!group)
        throw new TRPCError({
          message: `Property group not found`,
          code: "NOT_FOUND",
        });

      await assertPermission(ctx.db, userId, group.workspaceId, "board:edit");

      const options = await propertyOptionRepo.getAllByGroupId(
        ctx.db,
        group.id,
      );

      for (const option of options) {
        await propertyOptionRepo.softDelete(ctx.db, {
          publicId: option.publicId,
          deletedBy: userId,
        });
      }

      await propertyGroupRepo.softDelete(ctx.db, {
        publicId: input.groupPublicId,
        deletedBy: userId,
      });

      return { success: true };
    }),

  reorder: protectedProcedure
    .meta({
      openapi: {
        summary: "Reorder property groups",
        method: "PUT",
        path: "/property-groups/{groupPublicId}/reorder",
        description: "Changes the position of a property group within a board",
        tags: ["Property Groups"],
        protect: true,
      },
    })
    .input(
      z.object({
        groupPublicId: z.string().min(12),
        newIndex: z.number().min(0),
      }),
    )
    .output(z.object({ publicId: z.string(), newIndex: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const group = await propertyGroupRepo.getWorkspaceAndGroupIdByPublicId(
        ctx.db,
        input.groupPublicId,
      );

      if (!group)
        throw new TRPCError({
          message: `Property group not found`,
          code: "NOT_FOUND",
        });

      await assertPermission(ctx.db, userId, group.workspaceId, "board:edit");

      return propertyGroupRepo.reorder(ctx.db, {
        publicId: input.groupPublicId,
        newIndex: input.newIndex,
      });
    }),
});
