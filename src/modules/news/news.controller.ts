import type { Request, Response } from "express";
import { Prisma } from "../../@generated/login-client/index.js";
import { adminNewsListQuerySchema, adminNewsUpsertSchema, featuredNewsQuerySchema, newsListQuerySchema } from "./news.schema.js";
import {
  createNewsPostService,
  deleteNewsPostService,
  getNewsBySlugService,
  listAdminNewsService,
  listFeaturedNewsService,
  listPublicNewsService,
  updateNewsPostService,
} from "./news.service.js";

export async function createNewsPostController(req: Request, res: Response): Promise<void> {
  const parsed = adminNewsUpsertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  try {
    const item = await createNewsPostService(req.user!.id, parsed.data);
    res.status(201).json(item);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      res.status(409).json({ message: "Slug đã tồn tại" });
      return;
    }
    throw e;
  }
}

export async function updateNewsPostController(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = adminNewsUpsertSchema.safeParse(req.body);
  if (!id) {
    res.status(400).json({ message: "Thiếu ID bài viết" });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  try {
    const item = await updateNewsPostService(id, parsed.data);
    res.json(item);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      res.status(404).json({ message: "Không tìm thấy bài viết" });
      return;
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      res.status(409).json({ message: "Slug đã tồn tại" });
      return;
    }
    throw e;
  }
}

export async function deleteNewsPostController(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ message: "Thiếu ID bài viết" });
    return;
  }
  try {
    await deleteNewsPostService(id);
    res.json({ message: "Đã xóa bài viết" });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      res.status(404).json({ message: "Không tìm thấy bài viết" });
      return;
    }
    throw e;
  }
}

export async function listAdminNewsController(req: Request, res: Response): Promise<void> {
  const parsed = adminNewsListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: "Query không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  const result = await listAdminNewsService(parsed.data.page, parsed.data.limit, parsed.data.search);
  res.json(result);
}

export async function listPublicNewsController(req: Request, res: Response): Promise<void> {
  const parsed = newsListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: "Query không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  const result = await listPublicNewsService(parsed.data.page, parsed.data.limit);
  res.json(result);
}

export async function listFeaturedNewsController(req: Request, res: Response): Promise<void> {
  const parsed = featuredNewsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: "Query không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  const items = await listFeaturedNewsService(parsed.data.limit);
  res.json({ items });
}

export async function getNewsBySlugController(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  if (!slug) {
    res.status(400).json({ message: "Thiếu slug bài viết" });
    return;
  }
  const item = await getNewsBySlugService(slug);
  if (!item) {
    res.status(404).json({ message: "Không tìm thấy bài viết" });
    return;
  }
  res.json(item);
}

export async function uploadNewsImageController(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ message: "Thiếu file ảnh" });
    return;
  }
  const imageUrl = `/uploads/news/${req.file.filename}`;
  res.status(201).json({ imageUrl });
}
