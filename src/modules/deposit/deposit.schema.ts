import { z } from "zod";

export const createDepositSchema = z.object({
  amount: z.number().int().min(10000, "Số tiền tối thiểu 10.000đ"),
  method: z.enum(["vietqr", "momo"], { message: "Phương thức không hợp lệ (chọn VietQR hoặc MoMo)" }),
  /** Bỏ qua: server gán nội dung CK cố định `NGUTIENKY+{id}`. */
  note: z.string().max(256).optional(),
  server: z.string().min(1, "Thiếu thông tin server").max(16, "Mã server quá dài"),
});

export const updateDepositAdminSchema = z.object({
  amount: z.number().int().min(1000, "Số tiền tối thiểu 1.000đ").optional(),
  note: z
    .string()
    .trim()
    .regex(/^NT\d{6}$/, "Mã giao dịch phải theo định dạng NT + 6 số (VD: NT123456)")
    .optional(),
  status: z.enum(["pending", "approved", "rejected"], { message: "Trạng thái không hợp lệ" }).optional(),
  adminNote: z.string().max(512, "Ghi chú admin tối đa 512 ký tự").optional(),
});

export type CreateDepositInput = z.infer<typeof createDepositSchema>;
export type UpdateDepositAdminInput = z.infer<typeof updateDepositAdminSchema>;
