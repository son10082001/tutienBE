import { z } from "zod";

export const createDepositPromotionSchema = z
  .object({
    percent: z.number().int().min(1, "Tối thiểu 1%").max(100, "Tối đa 100%"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày bắt đầu dạng YYYY-MM-DD"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày kết thúc dạng YYYY-MM-DD"),
    label: z.string().max(128).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (d) => {
      const startAt = new Date(`${d.startDate}T00:00:00.000`).getTime();
      const endAt = new Date(`${d.endDate}T23:59:59.999`).getTime();
      return endAt >= startAt;
    },
    { message: "Ngày kết thúc phải từ ngày bắt đầu trở đi", path: ["endDate"] },
  )
  .transform((d) => {
    const startAt = new Date(`${d.startDate}T00:00:00.000`);
    const endAt = new Date(`${d.endDate}T23:59:59.999`);
    return {
      percent: d.percent,
      startAt,
      endAt,
      label: d.label,
      isActive: d.isActive,
    };
  });

export const patchDepositPromotionSchema = z.object({
  isActive: z.boolean().optional(),
  label: z.string().max(128).optional().nullable(),
});

export type CreateDepositPromotionParsed = z.output<typeof createDepositPromotionSchema>;
export type PatchDepositPromotionInput = z.infer<typeof patchDepositPromotionSchema>;
