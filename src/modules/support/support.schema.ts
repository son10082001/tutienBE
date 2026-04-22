import { z } from "zod";

export const createSupportTicketSchema = z.object({
  characterName: z.string().trim().max(64).optional().nullable(),
  serverName: z.string().trim().max(64).optional().nullable(),
  title: z.string().trim().min(4).max(255),
  content: z.string().trim().min(10).max(3000),
});

export const supportHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const createSupportChannelSchema = z.object({
  code: z.string().trim().min(2).max(32),
  name: z.string().trim().min(2).max(128),
  url: z.string().trim().url().max(512),
  icon: z.string().trim().max(64).optional().nullable(),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).max(9999).optional().default(0),
});

export const updateSupportChannelSchema = z.object({
  name: z.string().trim().min(2).max(128).optional(),
  url: z.string().trim().url().max(512).optional(),
  icon: z.string().trim().max(64).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;
export type CreateSupportChannelInput = z.infer<typeof createSupportChannelSchema>;
export type UpdateSupportChannelInput = z.infer<typeof updateSupportChannelSchema>;
