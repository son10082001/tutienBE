import { PrismaClient } from "../@generated/login-client/index.js";

/** `.../login` trong URL = đã có tên DB, không nối thêm. */
function mysqlUrlHasDatabasePath(url: string): boolean {
  const head = url.split("?")[0];
  return /:\/\/(?:[^@]+@)?[^/:]+(?::\d+)?\/(.+)/.test(head);
}

/** Trùng `DATABASE_LOGIN_URL` trong `.env` khi chạy migrate (schema-login). */
function resolveLoginDatabaseUrl(): string {
  const explicit = process.env.DATABASE_LOGIN_URL?.trim();
  if (explicit) return explicit;
  const base = process.env.DATABASE_URL!.trim().replace(/\/$/, "");
  if (mysqlUrlHasDatabasePath(base)) return base;
  return `${base}/login`;
}

export const prisma = new PrismaClient({
  datasources: { db: { url: resolveLoginDatabaseUrl() } },
});
