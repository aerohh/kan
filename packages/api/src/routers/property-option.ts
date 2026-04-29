import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { boards, propertyGroups } from "@kan/db/schema";
import * as propertyOptionRepo from "@kan/db/repository/property-option.repo";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertPermission } from "../utils/permissions";

const optionSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  colourCode: z.string().nullable(),
});

export const propertyOptionRouter = createTRPCRouter({
  create: protectedProcedure
    .meta({
      openapi: {
        summary: "Create a property option",
        method: "POST",
        path: "/property-options",
        description: "Creates a new option within a property group",
        tags: ["Property Options"],
        protect: true,
      },
    })
    .input(
      z.object({
        name: z.string().min(1).max(255),
        colourCode: z.string().min(7).max(7).optional(),
        groupPublicId: z.string().min(12),
      }),
    )
    .output(optionSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const group = await ctx.db.query.propertyGroups.findFirst({
        columns: { id: true, boardId: true },
        where: eq(propertyGroups.publicId, input.groupPublicId),
        with: {
          board: {
            columns: { workspaceId: true },
          },
        },
      });

      if (!group)
        throw new TRPCError({
          message: `Property group not found`,
          code: "NOT_FOUND",
        });

      await assertPermission(
        ctx.db,
        userId,
        group.board.workspaceId,
        "board:edit",
      );

      const result = await propertyOptionRepo.create(ctx.db, {
        name: input.name,
        colourCode: input.colourCode,
        groupId: group.id,
        boardId: group.boardId,
        createdBy: userId,
      });

      if (!result)
        throw new TRPCError({
          message: `Failed to create property option`,
          code: "INTERNAL_SERVER_ERROR",
        });

      return {
        publicId: result.publicId,
        name: result.name,
        colourCode: result.colourCode,
      };
    }),

  update: protectedProcedure
    .meta({
      openapi: {
        summary: "Update a property option",
        method: "PUT",
        path: "/property-options/{optionPublicId}",
        description: "Updates a property option name or colour",
        tags: ["Property Options"],
        protect: true,
      },
    })
    .input(
      z.object({
        optionPublicId: z.string().min(12),
        name: z.string().min(1).max(255).optional(),
        colourCode: z.string().min(7).max(7).optional(),
      }),
    )
    .output(optionSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const option = await propertyOptionRepo.getWorkspaceAndOptionIdByPublicId(
        ctx.db,
        input.optionPublicId,
      );

      if (!option)
        throw new TRPCError({
          message: `Property option not found`,
          code: "NOT_FOUND",
        });

      await assertPermission(ctx.db, userId, option.workspaceId, "board:edit");

      const result = await propertyOptionRepo.update(ctx.db, {
        publicId: input.optionPublicId,
        name: input.name,
        colourCode: input.colourCode,
      });

      if (!result)
        throw new TRPCError({
          message: `Failed to update property option`,
          code: "INTERNAL_SERVER_ERROR",
        });

      return {
        publicId: result.publicId,
        name: result.name,
        colourCode: result.colourCode,
      };
    }),

  delete: protectedProcedure
    .meta({
      openapi: {
        summary: "Delete a property option",
        method: "DELETE",
        path: "/property-options/{optionPublicId}",
        description: "Soft deletes a property option and removes all card links",
        tags: ["Property Options"],
        protect: true,
      },
    })
    .input(z.object({ optionPublicId: z.string().min(12) }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const option = await propertyOptionRepo.getWorkspaceAndOptionIdByPublicId(
        ctx.db,
        input.optionPublicId,
      );

      if (!option)
        throw new TRPCError({
          message: `Property option not found`,
          code: "NOT_FOUND",
        });

      await assertPermission(ctx.db, userId, option.workspaceId, "board:edit");

      await propertyOptionRepo.softDelete(ctx.db, {
        publicId: input.optionPublicId,
        deletedBy: userId,
      });

      return { success: true };
    }),
});
