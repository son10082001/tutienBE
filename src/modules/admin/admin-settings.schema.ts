import { z } from "zod";
import { ADMIN_PERMISSIONS, ADMIN_ROLES } from "./admin-access.service.js";

export const adminRoleSchema = z.enum(ADMIN_ROLES);
export const adminPermissionSchema = z.enum(ADMIN_PERMISSIONS);

export const createAdminAccountSchema = z.object({
  userId: z.string().trim().min(3).max(128),
  password: z.string().min(6).max(128),
  name: z.string().trim().min(2).max(24),
  role: adminRoleSchema.exclude(["SUPERADMIN"]).default("OPERATOR"),
});

export const updateAdminAccountSchema = z.object({
  name: z.string().trim().min(2).max(24).optional(),
  password: z.string().min(6).max(128).optional(),
  role: adminRoleSchema.optional(),
});

export const updateRolePermissionSchema = z.object({
  permissions: z.array(adminPermissionSchema).min(1),
});

export const updatePaymentMethodConfigSchema = z.object({
  accountName: z.string().trim().max(128).optional().nullable(),
  phoneNumber: z.string().trim().max(32).optional().nullable(),
  bankName: z.string().trim().max(128).optional().nullable(),
  bankCode: z.string().trim().max(32).optional().nullable(),
  bankNumber: z.string().trim().max(64).optional().nullable(),
});

export const createGameServerSchema = z.object({
  code: z.string().trim().min(2).max(32),
  name: z.string().trim().min(2).max(128),
  host: z.string().trim().max(255).optional().nullable(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

export type CreateAdminAccountInput = z.infer<typeof createAdminAccountSchema>;
export type UpdateAdminAccountInput = z.infer<typeof updateAdminAccountSchema>;
export type UpdateRolePermissionInput = z.infer<typeof updateRolePermissionSchema>;
export type UpdatePaymentMethodConfigInput = z.infer<typeof updatePaymentMethodConfigSchema>;
export type CreateGameServerInput = z.infer<typeof createGameServerSchema>;
