import { z } from "zod";

export const milestoneGiftEntrySchema = z.object({
  externalItemId: z.number().int().min(1),
  quantity: z.number().int().min(1).max(999999),
  itemName: z.string().max(128).optional(),
  imageUrl: z.string().max(512).optional(),
});

export const createCumulativeRechargeMilestoneSchema = z.object({
  thresholdAmount: z.number().int().min(1),
  title: z.string().max(128).optional().nullable(),
  gifts: z.array(milestoneGiftEntrySchema).min(1).max(50),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional(),
});

export const updateCumulativeRechargeMilestoneSchema = z.object({
  thresholdAmount: z.number().int().min(1).optional(),
  title: z.string().max(128).optional().nullable(),
  gifts: z.array(milestoneGiftEntrySchema).min(1).max(50).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const claimCumulativeRechargeSchema = z.object({
  milestoneId: z.string().min(1),
  serverId: z.number().int().min(1),
});

export type MilestoneGiftEntry = z.infer<typeof milestoneGiftEntrySchema>;
export type CreateCumulativeRechargeMilestoneInput = z.infer<typeof createCumulativeRechargeMilestoneSchema>;
export type UpdateCumulativeRechargeMilestoneInput = z.infer<typeof updateCumulativeRechargeMilestoneSchema>;
export type ClaimCumulativeRechargeInput = z.infer<typeof claimCumulativeRechargeSchema>;
