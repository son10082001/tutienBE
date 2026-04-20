/** Ngưỡng nạp tích luỹ (VNĐ) — đồng bộ với tổng amount deposit approved */
export const VIP_TIERS = [
  { level: 0, minAmount: 0 },
  { level: 1, minAmount: 100_000 },
  { level: 2, minAmount: 500_000 },
  { level: 3, minAmount: 1_000_000 },
  { level: 4, minAmount: 2_000_000 },
  { level: 5, minAmount: 5_000_000 },
  { level: 6, minAmount: 10_000_000 },
  { level: 7, minAmount: 20_000_000 },
] as const;

function formatVnd(n: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(n)}đ`;
}

export function computeVipInfo(totalDeposited: number) {
  let level = 0;
  for (const t of VIP_TIERS) {
    if (totalDeposited >= t.minAmount) level = t.level;
  }

  const next = VIP_TIERS[level + 1];
  const amountToNext = next ? Math.max(0, next.minAmount - totalDeposited) : null;

  let label: string;
  if (totalDeposited === 0) {
    label = "VIP 0 — Chưa nạp tiền";
  } else if (level === 0) {
    const need = VIP_TIERS[1].minAmount - totalDeposited;
    label = `VIP 0 — Đã nạp ${formatVnd(totalDeposited)} · Còn ${formatVnd(need)} để lên VIP 1`;
  } else {
    const tier = VIP_TIERS[level];
    label = `VIP ${level} — Tổng nạp từ ${formatVnd(tier.minAmount)}`;
    if (next && amountToNext !== null && amountToNext > 0) {
      label += ` · Còn ${formatVnd(amountToNext)} để lên VIP ${next.level}`;
    } else if (!next) {
      label += " · Hạng tối đa";
    }
  }

  return {
    vipLevel: level,
    vipLabel: label,
    nextVipLevel: next?.level ?? null,
    amountToNextVip: amountToNext,
  };
}
