import { prisma } from "../../lib/prisma.js";
import type { CreateDepositInput, UpdateDepositAdminInput } from "./deposit.schema.js";
import { computeDepositBonus, getBestActivePromotion } from "./deposit-promotion.service.js";

/** Nội dung chuyển khoản / mã giao dịch: `NGUTIENKY+` + id yêu cầu (uuid). */
export const DEPOSIT_TRANSFER_NOTE_PREFIX = "NGUTIENKY+";

export async function createDepositRequest(userId: string, input: CreateDepositInput) {
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
        method: input.method,
        note: "_",
        server: input.server,
        status: "pending",
      },
    });
    const note = `${DEPOSIT_TRANSFER_NOTE_PREFIX}${row.id}`;
    return tx.depositRequest.update({
      where: { id: row.id },
      data: { note },
    });
  });
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
