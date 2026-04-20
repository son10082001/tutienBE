import { z } from "zod";

export const createShopItemSchema = z.object({
  externalItemId: z.number().int().min(1),
  itemName: z.string().min(1).max(128),
  itemQuantity: z.number().int().min(1),
  price: z.number().int().min(1),
  imageUrl: z.string().max(512).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateShopItemSchema = z.object({
  externalItemId: z.number().int().min(1).optional(),
  itemName: z.string().min(1).max(128).optional(),
  itemQuantity: z.number().int().min(1).optional(),
  price: z.number().int().min(1).optional(),
  imageUrl: z.string().max(512).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const buyShopItemSchema = z.object({
  shopItemId: z.string().min(1),
  serverId: z.number().int().min(1),
  buyQuantity: z.number().int().min(1).max(999),
});

export const listShopItemsUserQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(12),
  search: z.string().trim().optional().default(""),
  priceRank: z.enum(["all", "low", "mid", "high", "vip"]).optional().default("all"),
  sort: z.enum(["latest", "price-asc", "price-desc"]).optional().default("latest"),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
});

export type CreateShopItemInput = z.infer<typeof createShopItemSchema>;
export type UpdateShopItemInput = z.infer<typeof updateShopItemSchema>;
export type BuyShopItemInput = z.infer<typeof buyShopItemSchema>;
export type ListShopItemsUserQueryInput = z.infer<typeof listShopItemsUserQuerySchema>;
