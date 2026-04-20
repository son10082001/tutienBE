import { prisma } from "../../lib/prisma.js";
import type { CreateDepositPromotionParsed, PatchDepositPromotionInput } from "./deposit-promotion.schema.js";

export async function getBestActivePromotion(at = new Date()) {
  return prisma.depositPromotion.findFirst({
    where: {
      isActive: true,
      startAt: { lte: at },
      endAt: { gte: at },
    },
    orderBy: { percent: "desc" },
  });
}

export function computeDepositBonus(amount: number, percent: number): number {
  return Math.floor((amount * percent) / 100);
}

export async function listDepositPromotions() {
  return prisma.depositPromotion.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function createDepositPromotion(input: CreateDepositPromotionParsed) {
  return prisma.depositPromotion.create({
    data: {
      percent: input.percent,
      startAt: input.startAt,
      endAt: input.endAt,
      label: input.label?.trim() || null,
      isActive: input.isActive ?? true,
    },
  });
}

export async function patchDepositPromotion(id: string, input: PatchDepositPromotionInput) {
  return prisma.depositPromotion.update({
    where: { id },
    data: {
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.label !== undefined && { label: input.label === null ? null : input.label.trim() || null }),
    },
  });
}
