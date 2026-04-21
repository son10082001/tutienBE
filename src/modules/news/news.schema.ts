import { z } from "zod";

export const adminNewsUpsertSchema = z.object({
  title: z.string().trim().min(3, "Tiêu đề tối thiểu 3 ký tự").max(255, "Tiêu đề tối đa 255 ký tự"),
  slug: z
    .string()
    .trim()
    .min(3, "Slug tối thiểu 3 ký tự")
    .max(255, "Slug tối đa 255 ký tự")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang"),
  excerpt: z.string().trim().min(10, "Mô tả ngắn tối thiểu 10 ký tự").max(512, "Mô tả ngắn tối đa 512 ký tự"),
  content: z.string().trim().min(30, "Nội dung tối thiểu 30 ký tự"),
  coverImage: z.string().trim().max(512, "Ảnh bìa tối đa 512 ký tự").optional().nullable(),
  isFeatured: z.boolean().optional().default(false),
  isPublished: z.boolean().optional().default(true),
  publishedAt: z.string().datetime().optional().nullable(),
});

export const adminNewsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().optional(),
});

export const newsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(9),
});

export const featuredNewsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(10).default(3),
});

export type AdminNewsUpsertInput = z.infer<typeof adminNewsUpsertSchema>;
