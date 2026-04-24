import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
  TICKET_EXCHANGE_RATE: z.coerce.number().int().min(1).default(1),
  TICKET_MAIL_API_BASE_URL: z.string().default("http://103.149.252.173:5000"),
  TICKET_MAIL_VERIFY_CODE: z.string().default("123123"),
  TICKET_MAIL_ITEM_ID: z.coerce.number().int().min(1).default(6),
  ADMIN_USER_IDS: z.string().default(""),
  ADMIN_TYPES: z.string().default("1"),
  SEPAY_WEBHOOK_SECRET: z.string().default(""),
  /** `1`/`true`/`yes`: ghi log stdout khi SePay gọi webhook (payload + kết quả, token đã che). */
  SEPAY_WEBHOOK_LOG: z
    .string()
    .default("0")
    .transform((s) => ["1", "true", "yes"].includes(s.trim().toLowerCase())),
});

export const env = envSchema.parse(process.env);
