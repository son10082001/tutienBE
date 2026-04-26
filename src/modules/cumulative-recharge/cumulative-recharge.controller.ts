import type { Request, Response } from "express";
import {
  claimCumulativeRechargeSchema,
  createCumulativeRechargeMilestoneSchema,
  updateCumulativeRechargeMilestoneSchema,
} from "./cumulative-recharge.schema.js";
import {
  claimCumulativeRechargeMilestoneService,
  createCumulativeRechargeMilestoneService,
  deleteCumulativeRechargeMilestoneService,
  getCumulativeRechargeUserStateService,
  listCumulativeRechargeMilestonesAdminService,
  updateCumulativeRechargeMilestoneService,
} from "./cumulative-recharge.service.js";

export async function listCumulativeRechargeMilestonesAdminController(_req: Request, res: Response): Promise<void> {
  const items = await listCumulativeRechargeMilestonesAdminService();
  res.json({ items });
}

export async function createCumulativeRechargeMilestoneController(req: Request, res: Response): Promise<void> {
  const parsed = createCumulativeRechargeMilestoneSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  const row = await createCumulativeRechargeMilestoneService(parsed.data);
  res.status(201).json(row);
}

export async function updateCumulativeRechargeMilestoneController(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ message: "Thiếu id" });
    return;
  }
  const parsed = updateCumulativeRechargeMilestoneSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  try {
    const row = await updateCumulativeRechargeMilestoneService(id, parsed.data);
    res.json(row);
  } catch {
    res.status(404).json({ message: "Không tìm thấy mốc nạp" });
  }
}

export async function deleteCumulativeRechargeMilestoneController(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ message: "Thiếu id" });
    return;
  }
  try {
    await deleteCumulativeRechargeMilestoneService(id);
    res.json({ message: "Đã xóa" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không xóa được";
    if (message.includes("Không xóa được")) {
      res.status(400).json({ message });
      return;
    }
    res.status(404).json({ message: "Không tìm thấy mốc nạp" });
  }
}

export async function getCumulativeRechargeUserStateController(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const data = await getCumulativeRechargeUserStateService(userId);
  res.json(data);
}

export async function claimCumulativeRechargeController(req: Request, res: Response): Promise<void> {
  const parsed = claimCumulativeRechargeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  try {
    const result = await claimCumulativeRechargeMilestoneService(req.user!.id, parsed.data);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nhận quà thất bại";
    res.status(400).json({ message });
  }
}
