import type { Request, Response } from "express";
import { createGiftCodeSchema, redeemGiftCodeSchema } from "./gift-code.schema.js";
import { createGiftCodesService, redeemGiftCodeService } from "./gift-code.service.js";

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
