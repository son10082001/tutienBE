import type { Request, Response } from "express";
import {
  buyShopItemSchema,
  createShopItemSchema,
  listShopItemsUserQuerySchema,
  updateShopItemSchema,
} from "./shop.schema.js";
import {
  buyShopItemService,
  createShopItemService,
  deleteShopItemService,
  getShopMetaForUserService,
  listExternalItemsService,
  listShopItemsAdminService,
  listShopItemsUserService,
  updateShopItemService,
} from "./shop.service.js";

export async function listExternalItemsController(_req: Request, res: Response): Promise<void> {
  try {
    const items = await listExternalItemsService();
    res.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không lấy được danh sách item";
    res.status(400).json({ message });
  }
}

export async function uploadShopImageController(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) {
    res.status(400).json({ message: "Thiếu file ảnh" });
    return;
  }

  const host = req.get("host");
  const url = host
    ? `${req.protocol}://${host}/uploads/shop/${file.filename}`
    : `/uploads/shop/${file.filename}`;

  res.status(201).json({ url });
}

export async function listShopItemsAdminController(_req: Request, res: Response): Promise<void> {
  const items = await listShopItemsAdminService();
  res.json({ items });
}

export async function createShopItemController(req: Request, res: Response): Promise<void> {
  const parsed = createShopItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  const item = await createShopItemService(parsed.data);
  res.status(201).json(item);
}

export async function updateShopItemController(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ message: "Thiếu id sản phẩm" });
    return;
  }
  const parsed = updateShopItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  try {
    const item = await updateShopItemService(id, parsed.data);
    res.json(item);
  } catch {
    res.status(404).json({ message: "Không tìm thấy sản phẩm" });
  }
}

export async function deleteShopItemController(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ message: "Thiếu id sản phẩm" });
    return;
  }
  try {
    await deleteShopItemService(id);
    res.json({ message: "Đã xóa sản phẩm" });
  } catch {
    res.status(404).json({ message: "Không tìm thấy sản phẩm" });
  }
}

export async function listShopItemsUserController(req: Request, res: Response): Promise<void> {
  const parsed = listShopItemsUserQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: "Query không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  const data = await listShopItemsUserService(parsed.data);
  res.json(data);
}

export async function getShopMetaController(req: Request, res: Response): Promise<void> {
  const data = await getShopMetaForUserService(req.user!.id);
  res.json(data);
}

export async function buyShopItemController(req: Request, res: Response): Promise<void> {
  const parsed = buyShopItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  try {
    const data = await buyShopItemService(req.user!.id, parsed.data);
    res.status(201).json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mua hàng thất bại";
    res.status(400).json({ message });
  }
}
