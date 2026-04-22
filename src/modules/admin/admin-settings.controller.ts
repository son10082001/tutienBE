import type { Request, Response } from "express";
import {
  adminRoleSchema,
  createAdminAccountSchema,
  createGameServerSchema,
  updateAdminAccountSchema,
  updatePaymentMethodConfigSchema,
  updateRolePermissionSchema,
} from "./admin-settings.schema.js";
import {
  createAdminAccountService,
  createGameServerService,
  deleteAdminAccountService,
  deleteGameServerService,
  listAdminSettingsService,
  listDepositOptionsService,
  listAdminAccountsService,
  updateAdminAccountService,
  updateFixedPaymentMethodService,
  updateRolePermissionsService,
} from "./admin-settings.service.js";

function ensureSuperAdmin(req: Request, res: Response): boolean {
  if (req.user?.adminRole !== "SUPERADMIN") {
    res.status(403).json({ message: "Chỉ superadmin được phép thực hiện thao tác này" });
    return false;
  }
  return true;
}

export async function listAdminSettingsController(_req: Request, res: Response): Promise<void> {
  const data = await listAdminSettingsService();
  res.json(data);
}

export async function listAdminAccountsController(_req: Request, res: Response): Promise<void> {
  const data = await listAdminAccountsService();
  res.json({ items: data });
}

export async function createAdminAccountController(req: Request, res: Response): Promise<void> {
  if (!ensureSuperAdmin(req, res)) return;
  const parsed = createAdminAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu tạo tài khoản admin chưa hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  const created = await createAdminAccountService(req.user!.id, parsed.data);
  res.status(201).json(created);
}

export async function updateAdminAccountController(req: Request, res: Response): Promise<void> {
  if (!ensureSuperAdmin(req, res)) return;
  const targetUserId = req.params.userId;
  const parsed = updateAdminAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu cập nhật admin không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  await updateAdminAccountService(targetUserId, parsed.data);
  res.json({ message: "Đã cập nhật admin" });
}

export async function deleteAdminAccountController(req: Request, res: Response): Promise<void> {
  if (!ensureSuperAdmin(req, res)) return;
  await deleteAdminAccountService(req.user!.id, req.params.userId);
  res.json({ message: "Đã xoá admin" });
}

export async function updateRolePermissionController(req: Request, res: Response): Promise<void> {
  if (!ensureSuperAdmin(req, res)) return;
  const roleParsed = adminRoleSchema.exclude(["SUPERADMIN"]).safeParse(req.params.role);
  const parsed = updateRolePermissionSchema.safeParse(req.body);
  if (!roleParsed.success || !parsed.success) {
    res.status(400).json({ message: "Dữ liệu quyền role không hợp lệ", errors: parsed.success ? undefined : parsed.error.flatten() });
    return;
  }
  const permissions = await updateRolePermissionsService(req.user!.id, roleParsed.data, parsed.data.permissions);
  res.json({ role: roleParsed.data, permissions });
}

export async function updatePaymentMethodConfigController(req: Request, res: Response): Promise<void> {
  if (!ensureSuperAdmin(req, res)) return;
  const code = String(req.params.code || "").toLowerCase();
  if (code !== "vietqr" && code !== "momo") {
    res.status(400).json({ message: "Chỉ hỗ trợ cấu hình momo hoặc vietqr" });
    return;
  }
  const parsed = updatePaymentMethodConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu phương thức thanh toán không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  const updated = await updateFixedPaymentMethodService(code, parsed.data);
  res.json(updated);
}

export async function createGameServerController(req: Request, res: Response): Promise<void> {
  if (!ensureSuperAdmin(req, res)) return;
  const parsed = createGameServerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu server game không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  const created = await createGameServerService(parsed.data);
  res.status(201).json(created);
}

export async function deleteGameServerController(req: Request, res: Response): Promise<void> {
  if (!ensureSuperAdmin(req, res)) return;
  await deleteGameServerService(req.params.id);
  res.json({ message: "Đã xóa server game" });
}

export async function listDepositOptionsController(_req: Request, res: Response): Promise<void> {
  const data = await listDepositOptionsService();
  res.json(data);
}
