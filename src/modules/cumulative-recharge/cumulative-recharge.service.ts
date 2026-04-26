import { prisma } from "../../lib/prisma.js";
import { getApprovedDepositTotalForUser } from "../deposit/deposit.service.js";
import { sendItemBatchMailByRoleUid } from "../shop/external-mail-api.js";
import { listExchangeCharacters, listExchangeServers } from "../ticket-exchange/ticket-exchange.service.js";
import type { MilestoneGiftEntry } from "./cumulative-recharge.schema.js";

function parseGifts(raw: unknown): MilestoneGiftEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: MilestoneGiftEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const externalItemId = Number(o.externalItemId);
    const quantity = Number(o.quantity);
    if (!Number.isFinite(externalItemId) || externalItemId < 1) continue;
    if (!Number.isFinite(quantity) || quantity < 1) continue;
    const itemName = typeof o.itemName === "string" ? o.itemName.slice(0, 128) : undefined;
    const imageUrl = typeof o.imageUrl === "string" ? o.imageUrl.slice(0, 512) : undefined;
    out.push({ externalItemId, quantity, itemName, imageUrl });
  }
  return out;
}

export async function listCumulativeRechargeMilestonesAdminService() {
  const rows = await prisma.cumulativeRechargeMilestone.findMany({
    orderBy: [{ sortOrder: "asc" }, { thresholdAmount: "asc" }],
  });
  return rows.map((r) => ({
    ...r,
    gifts: parseGifts(r.gifts),
  }));
}

export async function createCumulativeRechargeMilestoneService(input: {
  thresholdAmount: number;
  title?: string | null;
  gifts: MilestoneGiftEntry[];
  sortOrder?: number;
  isActive?: boolean;
}) {
  return prisma.cumulativeRechargeMilestone.create({
    data: {
      thresholdAmount: input.thresholdAmount,
      title: input.title?.trim() ? input.title.trim() : null,
      gifts: input.gifts as unknown as object[],
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    },
  });
}

export async function updateCumulativeRechargeMilestoneService(
  id: string,
  input: {
    thresholdAmount?: number;
    title?: string | null;
    gifts?: MilestoneGiftEntry[];
    sortOrder?: number;
    isActive?: boolean;
  },
) {
  return prisma.cumulativeRechargeMilestone.update({
    where: { id },
    data: {
      ...(input.thresholdAmount !== undefined && { thresholdAmount: input.thresholdAmount }),
      ...(input.title !== undefined && { title: input.title?.trim() ? input.title.trim() : null }),
      ...(input.gifts !== undefined && { gifts: input.gifts as unknown as object[] }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
}

export async function deleteCumulativeRechargeMilestoneService(id: string) {
  const claimCount = await prisma.cumulativeRechargeClaim.count({ where: { milestoneId: id } });
  if (claimCount > 0) {
    throw new Error("Không xóa được mốc đã có người nhận quà");
  }
  await prisma.cumulativeRechargeMilestone.delete({ where: { id } });
}

export async function getCumulativeRechargeUserStateService(userId: string) {
  const [totalDeposited, milestones, claims, servers, characters] = await Promise.all([
    getApprovedDepositTotalForUser(userId),
    prisma.cumulativeRechargeMilestone.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { thresholdAmount: "asc" }],
    }),
    prisma.cumulativeRechargeClaim.findMany({
      where: { userId },
      select: { milestoneId: true },
    }),
    listExchangeServers(),
    listExchangeCharacters(userId),
  ]);

  const claimedSet = new Set(claims.map((c) => c.milestoneId));

  const items = milestones.map((m) => {
    const gifts = parseGifts(m.gifts);
    const claimed = claimedSet.has(m.id);
    const eligible = totalDeposited >= m.thresholdAmount;
    return {
      id: m.id,
      thresholdAmount: m.thresholdAmount,
      title: m.title,
      sortOrder: m.sortOrder,
      gifts,
      claimed,
      eligible,
      canClaim: eligible && !claimed,
    };
  });

  return {
    totalDeposited,
    milestones: items,
    servers,
    characters,
  };
}

export async function claimCumulativeRechargeMilestoneService(
  userId: string,
  input: { milestoneId: string; serverId: number },
) {
  const milestone = await prisma.cumulativeRechargeMilestone.findFirst({
    where: { id: input.milestoneId, isActive: true },
  });
  if (!milestone) {
    throw new Error("Mốc nạp không tồn tại hoặc đã tắt");
  }

  const totalDeposited = await getApprovedDepositTotalForUser(userId);
  if (totalDeposited < milestone.thresholdAmount) {
    throw new Error("Tổng nạp chưa đạt mốc này");
  }

  const existing = await prisma.cumulativeRechargeClaim.findUnique({
    where: { userId_milestoneId: { userId, milestoneId: milestone.id } },
  });
  if (existing) {
    throw new Error("Bạn đã nhận quà mốc này");
  }

  const characters = await listExchangeCharacters(userId);
  const player = characters.find((c) => c.serverId === input.serverId);
  if (!player) {
    throw new Error("Tài khoản chưa có nhân vật ở server đã chọn");
  }

  const gifts = parseGifts(milestone.gifts);
  if (gifts.length === 0) {
    throw new Error("Mốc này chưa cấu hình quà");
  }

  let reservedClaimId: string | null = null;
  try {
    const claim = await prisma.cumulativeRechargeClaim.create({
      data: {
        userId,
        milestoneId: milestone.id,
        serverId: player.serverId,
        playerUid: player.uid,
        playerName: player.name,
      },
    });
    reservedClaimId = claim.id;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("uniq_crc_user_milestone") || msg.includes("Unique constraint")) {
      throw new Error("Bạn đã nhận quà mốc này");
    }
    throw error;
  }

  try {
    await sendItemBatchMailByRoleUid(
      player.uid,
      gifts.map((g) => ({ itemId: g.externalItemId, quantity: g.quantity })),
    );
  } catch (error) {
    if (reservedClaimId) {
      await prisma.cumulativeRechargeClaim.delete({ where: { id: reservedClaimId } }).catch(() => {});
    }
    const message = error instanceof Error ? error.message : "Gửi quà thất bại";
    throw new Error(`Nhận quà thất bại: ${message}`);
  }

  return { message: "Đã gửi quà vào mail game. Vui lòng kiểm tra hộp thư." };
}
