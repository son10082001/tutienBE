import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import type { CreateDepositInput, UpdateDepositAdminInput } from "./deposit.schema.js";
import { computeDepositBonus, getBestActivePromotion } from "./deposit-promotion.service.js";
import { listDepositOptionsService } from "../admin/admin-settings.service.js";

/** Mã giao dịch cố định dạng: `NT` + 6 chữ số. */
export const DEPOSIT_TRANSFER_NOTE_PREFIX = "NT";

function toTransferNoteFromId(id: string): string {
  const digits = id.replace(/\D/g, "").slice(0, 6).padEnd(6, "0");
  return `${DEPOSIT_TRANSFER_NOTE_PREFIX}${digits}`;
}

function resolveWebhookSecretFromHeader(authHeader?: string, tokenHeader?: string): string | null {
  const bearer = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (bearer && bearer.length > 0) return bearer;
  const apiKey = authHeader?.match(/^Apikey\s+(.+)$/i)?.[1]?.trim();
  if (apiKey && apiKey.length > 0) return apiKey;
  const plain = tokenHeader?.trim();
  return plain && plain.length > 0 ? plain : null;
}

function extractTransferNote(payload: Record<string, unknown>): string | null {
  const nested = payload.data && typeof payload.data === "object" ? (payload.data as Record<string, unknown>) : null;
  const sources = [
    payload.content,
    payload.description,
    payload.code,
    payload.transferContent,
    payload.transactionContent,
    nested?.content,
    nested?.description,
    nested?.code,
    nested?.transferContent,
    nested?.transactionContent,
  ];
  for (const source of sources) {
    if (typeof source !== "string") continue;
    const matched = source.toUpperCase().match(/NT\d{6}/);
    if (matched) return matched[0];
  }
  return null;
}

export function previewSepayPayloadParse(payload: Record<string, unknown>): {
  note: string | null;
  amount: number | null;
} {
  return { note: extractTransferNote(payload), amount: extractTransferAmount(payload) };
}

function extractTransferAmount(payload: Record<string, unknown>): number | null {
  const nested = payload.data && typeof payload.data === "object" ? (payload.data as Record<string, unknown>) : null;
  const candidates = [
    payload.transferAmount,
    payload.amount,
    payload.transfer_amount,
    payload.transactionAmount,
    payload.money,
    nested?.transferAmount,
    nested?.amount,
    nested?.transfer_amount,
    nested?.transactionAmount,
    nested?.money,
  ];
  for (const value of candidates) {
    const num =
      typeof value === "number"
        ? value
        : typeof value === "string"
        ? Number(value.replace(/[^\d.-]/g, ""))
        : Number(value);
    if (Number.isFinite(num) && num > 0) return Math.floor(num);
  }
  return null;
}

export async function createDepositRequest(userId: string, input: CreateDepositInput) {
  const method = await prisma.paymentMethodSetting.findFirst({
    where: { code: input.method, isActive: true },
  });
  if (!method) {
    throw new Error("Phương thức thanh toán không tồn tại hoặc đã bị tắt");
  }
  const resolvedServer = input.server?.trim() ? input.server.trim() : "all";

  const promo = await getBestActivePromotion();
  const promoPercentSnapshot = promo?.percent ?? null;
  const bonusAmount =
    promoPercentSnapshot !== null ? computeDepositBonus(input.amount, promoPercentSnapshot) : 0;

  return prisma.$transaction(async (tx) => {
    const row = await tx.depositRequest.create({
      data: {
        userId,
        amount: input.amount,
        bonusAmount,
        promoPercentSnapshot,
        method: method.code,
        note: "_",
        server: resolvedServer,
        status: "pending",
      },
    });
    const note = toTransferNoteFromId(row.id);
    return tx.depositRequest.update({
      where: { id: row.id },
      data: { note },
    });
  });
}

export async function getDepositOptions() {
  return listDepositOptionsService();
}

export async function getMyDeposits(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.depositRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.depositRequest.count({ where: { userId } }),
  ]);
  return { items, total, page, limit };
}

export async function getApprovedDepositTotalForUser(userId: string): Promise<number> {
  const rows = await prisma.depositRequest.findMany({
    where: { userId, status: "approved" },
    select: { amount: true, bonusAmount: true },
  });
  return rows.reduce((sum, row) => sum + row.amount + row.bonusAmount, 0);
}

export async function getAllDeposits(page = 1, limit = 20, status?: string) {
  const where = status ? { status } : {};
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.depositRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.depositRequest.count({ where }),
  ]);
  return { items, total, page, limit };
}

export async function getDepositById(id: string) {
  return prisma.depositRequest.findUnique({ where: { id } });
}

export async function approveDeposit(id: string, adminNote?: string) {
  return prisma.depositRequest.update({
    where: { id },
    data: { status: "approved", adminNote: adminNote ?? null },
  });
}

export async function rejectDeposit(id: string, adminNote?: string) {
  return prisma.depositRequest.update({
    where: { id },
    data: { status: "rejected", adminNote: adminNote ?? null },
  });
}

export async function updateDepositAdmin(id: string, input: UpdateDepositAdminInput) {
  const existing = await prisma.depositRequest.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Không tìm thấy yêu cầu nạp tiền");
  }

  let bonusAmount = existing.bonusAmount;
  if (input.amount !== undefined && existing.promoPercentSnapshot != null) {
    bonusAmount = computeDepositBonus(input.amount, existing.promoPercentSnapshot);
  }

  return prisma.depositRequest.update({
    where: { id },
    data: {
      ...(input.amount !== undefined && { amount: input.amount, bonusAmount }),
      ...(input.note !== undefined && { note: input.note }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.adminNote !== undefined && { adminNote: input.adminNote }),
    },
  });
}

export async function processSepayWebhook(
  payload: Record<string, unknown>,
  authHeader?: string,
  tokenHeader?: string,
) {
  const configuredSecret = env.SEPAY_WEBHOOK_SECRET.trim();
  if (configuredSecret.length > 0) {
    const receivedSecret = resolveWebhookSecretFromHeader(authHeader, tokenHeader);
    if (!receivedSecret || receivedSecret !== configuredSecret) {
      return { ok: false, code: "UNAUTHORIZED" as const };
    }
  }

  const note = extractTransferNote(payload);
  const amount = extractTransferAmount(payload);
  if (!note || !amount) {
    return { ok: true, code: "IGNORED_INVALID_PAYLOAD" as const };
  }

  const matched = await prisma.depositRequest.findFirst({
    where: { note, status: "pending", amount },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!matched) {
    return { ok: true, code: "IGNORED_NOT_FOUND" as const, note, amount };
  }

  const updated = await prisma.depositRequest.updateMany({
    where: { id: matched.id, status: "pending" },
    data: { status: "approved", adminNote: "Auto duyet boi SePay webhook" },
  });
  if (updated.count === 0) {
    return { ok: true, code: "IGNORED_ALREADY_PROCESSED" as const, note, amount, depositId: matched.id };
  }

  return { ok: true, code: "APPROVED" as const, note, amount, depositId: matched.id };
}
