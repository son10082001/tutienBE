import type { Request, Response } from "express";
import { createDepositSchema, updateDepositAdminSchema } from "./deposit.schema.js";
import {
  approveDeposit,
  createDepositRequest,
  getAllDeposits,
  getDepositById,
  getMyDeposits,
  rejectDeposit,
  updateDepositAdmin,
} from "./deposit.service.js";

// ─── User controllers ──────────────────────────────────────────────────────────

export async function createDepositController(req: Request, res: Response): Promise<void> {
  const parsed = createDepositSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  const deposit = await createDepositRequest(req.user!.id, parsed.data);
  res.status(201).json(deposit);
}

export async function getMyDepositsController(req: Request, res: Response): Promise<void> {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const result = await getMyDeposits(req.user!.id, page, limit);
  res.json(result);
}

// ─── Admin controllers ─────────────────────────────────────────────────────────

export async function getAllDepositsController(req: Request, res: Response): Promise<void> {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const status = req.query.status as string | undefined;
  const result = await getAllDeposits(page, limit, status);
  res.json(result);
}

export async function approveDepositController(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { adminNote } = req.body as { adminNote?: string };
  const deposit = await getDepositById(id);
  if (!deposit) {
    res.status(404).json({ message: "Không tìm thấy yêu cầu nạp tiền" });
    return;
  }
  const updated = await approveDeposit(id, adminNote);
  res.json(updated);
}

export async function rejectDepositController(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { adminNote } = req.body as { adminNote?: string };
  const deposit = await getDepositById(id);
  if (!deposit) {
    res.status(404).json({ message: "Không tìm thấy yêu cầu nạp tiền" });
    return;
  }
  const updated = await rejectDeposit(id, adminNote);
  res.json(updated);
}

export async function updateDepositAdminController(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = updateDepositAdminSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  const deposit = await getDepositById(id);
  if (!deposit) {
    res.status(404).json({ message: "Không tìm thấy yêu cầu nạp tiền" });
    return;
  }
  const updated = await updateDepositAdmin(id, parsed.data);
  res.json(updated);
}
