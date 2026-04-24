import { z } from "zod";

export const docCreateResponseSchema = z.object({
  publicId: z.string(),
  title: z.string(),
});

export const docUpdateResponseSchema = z.object({
  publicId: z.string(),
  title: z.string(),
  updatedAt: z.date().nullable(),
});

export const docDetailSchema = z.object({
  publicId: z.string(),
  title: z.string(),
  content: z.array(z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
});

export const docListItemSchema = z.object({
  publicId: z.string(),
  title: z.string(),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
});
