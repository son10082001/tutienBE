import type { Request, Response } from "express";
import { createDepositPromotionSchema, patchDepositPromotionSchema } from "./deposit-promotion.schema.js";
import {
  createDepositPromotion,
  getBestActivePromotion,
  listDepositPromotions,
  patchDepositPromotion,
} from "./deposit-promotion.service.js";

export async function getActiveDepositPromotionController(_req: Request, res: Response): Promise<void> {
  const p = await getBestActivePromotion();
  if (!p) {
    res.json({ active: null });
    return;
  }
  res.json({
    active: {
      id: p.id,
      percent: p.percent,
      label: p.label,
      startAt: p.startAt.toISOString(),
      endAt: p.endAt.toISOString(),
    },
  });
}

export async function listDepositPromotionsAdminController(_req: Request, res: Response): Promise<void> {
  const items = await listDepositPromotions();
  res.json({ items });
}

export async function createDepositPromotionAdminController(req: Request, res: Response): Promise<void> {
  const parsed = createDepositPromotionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  try {
    const row = await createDepositPromotion(parsed.data);
    res.status(201).json(row);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Tạo khuyến mãi thất bại";
    res.status(400).json({ message });
  }
}

export async function patchDepositPromotionAdminController(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ message: "Thiếu id" });
    return;
  }
  const parsed = patchDepositPromotionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  try {
    const row = await patchDepositPromotion(id, parsed.data);
    res.json(row);
  } catch {
    res.status(404).json({ message: "Không tìm thấy khuyến mãi" });
  }
}
