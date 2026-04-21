import type { Request, Response } from "express";
import { getAdminDashboardStatsService } from "./admin.service.js";

export async function getAdminDashboardStatsController(_req: Request, res: Response): Promise<void> {
  const stats = await getAdminDashboardStatsService();
  res.json(stats);
}
