import { z } from "zod";

export const createGiftCodeSchema = z.object({
  name: z.string().min(1, "Tên không được để trống"),
  channel: z.string().default("0"),
  generateCount: z.coerce.number().int().positive("Số lượng phải lớn hơn 0"),
  expiryDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Ngày hết hạn không hợp lệ",
  }),
  bonusesStr: z.string().min(1, "Danh sách phần thưởng không được để trống"),
  vipLevel: z.coerce.number().int().min(0).default(0),
  useType: z.string().default("0"),
});

export type CreateGiftCodeInput = z.infer<typeof createGiftCodeSchema>;

export const redeemGiftCodeSchema = z.object({
  code: z.string().length(15, "Mã gift code phải có 15 ký tự"),
  serverId: z.coerce.number().int().positive("Server ID không hợp lệ"),
  roleId: z.string().min(1, "Role ID không được để trống"),
});

export type RedeemGiftCodeInput = z.infer<typeof redeemGiftCodeSchema>;
