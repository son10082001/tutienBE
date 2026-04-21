import type { Request, Response } from "express";
import {
  createGiftCodeSchema,
  listGiftCodeBatchesQuerySchema,
  redeemGiftCodeSchema,
  updateGiftCodeBatchSchema,
} from "./gift-code.schema.js";
import {
  createGiftCodesService,
  deleteGiftCodeBatchService,
  getGiftCodeBatchCodesService,
  getGiftCodeItemsService,
  listGiftCodeBatchesService,
  redeemGiftCodeService,
  updateGiftCodeBatchService,
} from "./gift-code.service.js";

export async function createGiftCodeController(req: Request, res: Response): Promise<void> {
  const parsed = createGiftCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: parsed.error.flatten() });
    return;
  }

  try {
    const codes = await createGiftCodesService(parsed.data);
    res.status(201).json({
      message: "Tạo mã gift code thành công",
      count: codes.length,
      codes: codes,
    });
  } catch (error: any) {
    console.error("Error creating gift codes:", error);
    res.status(500).json({ message: "Lỗi hệ thống khi tạo mã gift code", error: error.message });
  }
}

export async function redeemGiftCodeController(req: Request, res: Response): Promise<void> {
  const parsed = redeemGiftCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: parsed.error.flatten() });
    return;
  }

  try {
    const result = await redeemGiftCodeService(parsed.data);
    res.status(200).json(result);
  } catch (error: any) {
    console.error("Error redeeming gift code:", error);
    res.status(400).json({ message: error.message || "Lỗi khi nhập mã gift code" });
  }
}

export async function getGiftCodeItemsController(req: Request, res: Response): Promise<void> {
  try {
    const items = await getGiftCodeItemsService();
    res.status(200).json(items);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export async function listGiftCodeBatchesController(req: Request, res: Response): Promise<void> {
  try {
    const parsed = listGiftCodeBatchesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ message: "Query không hợp lệ", errors: parsed.error.flatten() });
      return;
    }
    const batches = await listGiftCodeBatchesService(parsed.data);
    res.status(200).json(batches);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách đợt Gift Code" });
  }
}

export async function getGiftCodeBatchCodesController(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const codes = await getGiftCodeBatchCodesService(Number(id));
    res.status(200).json(codes);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách mã Gift Code" });
  }
}

export async function updateGiftCodeBatchController(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const batchId = Number(id);
  if (!Number.isFinite(batchId) || batchId <= 0) {
    res.status(400).json({ message: "ID đợt không hợp lệ" });
    return;
  }
  const parsed = updateGiftCodeBatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  try {
    const updated = await updateGiftCodeBatchService(batchId, parsed.data);
    res.status(200).json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error?.message || "Lỗi khi cập nhật đợt Gift Code" });
  }
}

export async function deleteGiftCodeBatchController(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const batchId = Number(id);
  if (!Number.isFinite(batchId) || batchId <= 0) {
    res.status(400).json({ message: "ID đợt không hợp lệ" });
    return;
  }
  try {
    await deleteGiftCodeBatchService(batchId);
    res.status(200).json({ message: "Đã xóa đợt Gift Code" });
  } catch (error: any) {
    res.status(400).json({ message: error?.message || "Lỗi khi xóa đợt Gift Code" });
  }
}
