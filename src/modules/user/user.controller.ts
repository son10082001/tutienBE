import type { Request, Response } from "express";
import { adminSendItemMailSchema, updateProfileSchema } from "./user.schema.js";
import {
  adminSendItemMailToUserService,
  deleteUserService,
  getUserGameMetaForAdminService,
  listUsersService,
  updateProfileService,
} from "./user.service.js";

export async function updateProfileController(req: Request, res: Response): Promise<void> {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  try {
    const user = await updateProfileService(req.user!.id, parsed.data);
    res.json(user);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cập nhật thất bại";
    res.status(400).json({ message });
  }
}

export async function listUsersAdminController(req: Request, res: Response): Promise<void> {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = req.query.search as string | undefined;
  const result = await listUsersService(page, limit, search);
  res.json(result);
}

export async function deleteUserAdminController(req: Request, res: Response): Promise<void> {
  const { userId } = req.params;
  if (!userId) {
    res.status(400).json({ message: "Thiếu mã người dùng" });
    return;
  }
  try {
    await deleteUserService(req.user!.id, userId);
    res.json({ message: "Đã xóa người dùng" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Xóa người dùng thất bại";
    const status = message.includes("Không tìm thấy") ? 404 : 400;
    res.status(status).json({ message });
  }
}

export async function getUserGameMetaAdminController(req: Request, res: Response): Promise<void> {
  const { userId } = req.params;
  if (!userId) {
    res.status(400).json({ message: "Thiếu mã người dùng" });
    return;
  }
  try {
    const data = await getUserGameMetaForAdminService(userId);
    res.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Không tải được dữ liệu game";
    const status = message.includes("Không tìm thấy") ? 404 : 400;
    res.status(status).json({ message });
  }
}

export async function adminSendItemMailController(req: Request, res: Response): Promise<void> {
  const { userId } = req.params;
  if (!userId) {
    res.status(400).json({ message: "Thiếu mã người dùng" });
    return;
  }
  const parsed = adminSendItemMailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  try {
    const data = await adminSendItemMailToUserService(userId, parsed.data);
    res.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gửi vật phẩm thất bại";
    res.status(400).json({ message });
  }
}
