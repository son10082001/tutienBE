import { z } from "zod";

export const loginSchema = z.object({
  userId: z.string().min(1),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  userId: z.string().trim().min(1).max(128),
  password: z.string().min(1),
  referredBy: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
