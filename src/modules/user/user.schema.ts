import { z } from "zod";

export const updateProfileSchema = z
  .object({
    name: z.string().min(1, "Tên không được để trống").max(24, "Tên tối đa 24 ký tự").optional(),
    email: z.union([z.string().email("Email không hợp lệ"), z.literal("")]).optional(),
    phone: z.string().max(32, "Số điện thoại tối đa 32 ký tự").optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().max(128).optional(),
  })
  .superRefine((data, ctx) => {
    const np = data.newPassword?.trim() ?? "";
    if (np.length > 0) {
      if (np.length < 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Mật khẩu mới tối thiểu 6 ký tự",
          path: ["newPassword"],
        });
      }
      if (!data.currentPassword?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu",
          path: ["currentPassword"],
        });
      }
      return;
    }

    const hasProfile =
      data.name !== undefined || data.email !== undefined || data.phone !== undefined;
    if (!hasProfile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng cập nhật hồ sơ hoặc điền mật khẩu mới",
      });
    }
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const adminSendItemMailSchema = z.object({
  serverId: z.coerce.number().int().positive(),
  externalItemId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).max(9999),
});

export type AdminSendItemMailInput = z.infer<typeof adminSendItemMailSchema>;
