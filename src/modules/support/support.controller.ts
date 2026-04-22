import type { Request, Response } from "express";
import {
  createSupportChannelSchema,
  createSupportTicketSchema,
  supportHistoryQuerySchema,
  updateSupportChannelSchema,
} from "./support.schema.js";
import {
  createSupportChannelService,
  createSupportTicketService,
  deleteSupportChannelService,
  listMySupportTicketsService,
  listSupportChannelsForAdminService,
  listSupportMetaService,
  updateSupportChannelService,
} from "./support.service.js";

function ensureSuperAdmin(req: Request, res: Response): boolean {
  if (req.user?.adminRole !== "SUPERADMIN") {
    res.status(403).json({ message: "Chỉ superadmin được phép thực hiện thao tác này" });
    return false;
  }
  return true;
}

export async function getSupportMetaController(_req: Request, res: Response): Promise<void> {
  const data = await listSupportMetaService();
  res.json(data);
}

export async function createSupportTicketController(req: Request, res: Response): Promise<void> {
  const parsed = createSupportTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu yêu cầu hỗ trợ không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  try {
    const created = await createSupportTicketService(req.user!.id, parsed.data);
    res.status(201).json(created);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tạo yêu cầu hỗ trợ thất bại";
    if (message.includes("support_ticket")) {
      res.status(500).json({
        message:
          "Hệ thống CSKH chưa sẵn sàng (thiếu bảng support_ticket). Vui lòng chạy migrate login + prisma:generate rồi restart backend.",
      });
      return;
    }
    throw error;
  }
}

export async function getMySupportTicketsController(req: Request, res: Response): Promise<void> {
  const parsed = supportHistoryQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: "Query không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  try {
    const data = await listMySupportTicketsService(req.user!.id, parsed.data.page, parsed.data.limit);
    res.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lấy lịch sử hỗ trợ thất bại";
    if (message.includes("support_ticket")) {
      res.status(500).json({
        message:
          "Hệ thống CSKH chưa sẵn sàng (thiếu bảng support_ticket). Vui lòng chạy migrate login + prisma:generate rồi restart backend.",
      });
      return;
    }
    throw error;
  }
}

export async function listSupportChannelsAdminController(_req: Request, res: Response): Promise<void> {
  const items = await listSupportChannelsForAdminService();
  res.json({ items });
}

export async function createSupportChannelAdminController(req: Request, res: Response): Promise<void> {
  if (!ensureSuperAdmin(req, res)) return;
  const parsed = createSupportChannelSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu kênh liên hệ không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  const created = await createSupportChannelService(parsed.data);
  res.status(201).json(created);
}

export async function updateSupportChannelAdminController(req: Request, res: Response): Promise<void> {
  if (!ensureSuperAdmin(req, res)) return;
  const parsed = updateSupportChannelSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu cập nhật kênh liên hệ không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  const updated = await updateSupportChannelService(req.params.id, parsed.data);
  res.json(updated);
}

export async function deleteSupportChannelAdminController(req: Request, res: Response): Promise<void> {
  if (!ensureSuperAdmin(req, res)) return;
  await deleteSupportChannelService(req.params.id);
  res.json({ message: "Đã xóa kênh liên hệ" });
}

export async function uploadSupportIconAdminController(req: Request, res: Response): Promise<void> {
  if (!ensureSuperAdmin(req, res)) return;
  if (!req.file) {
    res.status(400).json({ message: "Thiếu file icon" });
    return;
  }
  const imageUrl = `/uploads/support/${req.file.filename}`;
  res.status(201).json({ imageUrl });
}
