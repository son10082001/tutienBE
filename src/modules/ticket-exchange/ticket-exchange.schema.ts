import { z } from "zod";

export const createTicketConversionSchema = z.object({
  serverId: z.number().int().min(1, "Vui lòng chọn server"),
  amount: z.number().int().min(1, "Số tiền phải lớn hơn 0"),
});

export const historyTicketExchangeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type CreateTicketConversionInput = z.infer<typeof createTicketConversionSchema>;
