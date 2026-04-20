/**
 * Gán DATABASE_LOGIN_URL (giống logic src/lib/prisma.ts) rồi chạy migrate — tránh lỗi thiếu biến khi chỉ có DATABASE_URL.
 */
import { config } from "dotenv";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(root, ".env") });

function mysqlUrlHasDatabasePath(url) {
  const head = url.split("?")[0];
  return /:\/\/(?:[^@]+@)?[^/:]+(?::\d+)?\/(.+)/.test(head);
}

function resolveLoginDatabaseUrl() {
  const explicit = process.env.DATABASE_LOGIN_URL?.trim();
  if (explicit) return explicit;
  const base = process.env.DATABASE_URL?.trim().replace(/\/$/, "");
  if (!base) {
    console.error("Thiếu DATABASE_URL hoặc DATABASE_LOGIN_URL trong .env");
    process.exit(1);
  }
  if (mysqlUrlHasDatabasePath(base)) return base;
  return `${base}/login`;
}

process.env.DATABASE_LOGIN_URL = resolveLoginDatabaseUrl();

const prisma = path.join(root, "node_modules", ".bin", "prisma");
const r = spawnSync(
  prisma,
  ["migrate", "deploy", "--schema", "prisma/schema-login.prisma"],
  { cwd: root, stdio: "inherit", env: process.env },
);

process.exit(r.status ?? 1);
