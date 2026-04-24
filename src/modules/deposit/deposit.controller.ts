import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { createDepositSchema, updateDepositAdminSchema } from "./deposit.schema.js";
import {
  approveDeposit,
  createDepositRequest,
  getAllDeposits,
  getDepositOptions,
  getDepositById,
  getMyDeposits,
  previewSepayPayloadParse,
  processSepayWebhook,
  rejectDeposit,
  updateDepositAdmin,
} from "./deposit.service.js";

function redactAuthStyleHeader(h: string | undefined): string {
  if (!h || !h.trim()) return "(none)";
  const t = h.trim();
  const m = t.match(/^(Apikey|Bearer)\s+(.+)$/i);
  if (m) {
    const secret = m[2]!;
    const tail = secret.length <= 4 ? "****" : `***${secret.slice(-4)}`;
    return `${m[1]} ${tail}`;
  }
  return `*** (len ${t.length})`;
}

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

export async function getDepositOptionsController(_req: Request, res: Response): Promise<void> {
  const data = await getDepositOptions();
  res.json(data);
}

export async function sepayWebhookController(req: Request, res: Response): Promise<void> {
  const payload = (req.body ?? {}) as Record<string, unknown>;
  const xTokenHeader =
    typeof req.headers["x-sepay-token"] === "string" ? req.headers["x-sepay-token"] : undefined;
  const result = await processSepayWebhook(payload, req.headers.authorization, xTokenHeader);

  if (env.SEPAY_WEBHOOK_LOG) {
    const parse = previewSepayPayloadParse(payload);
    const forwarded = req.headers["x-forwarded-for"];
    const ip =
      typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : req.socket?.remoteAddress ?? null;
    const tokenRedacted =
      xTokenHeader && xTokenHeader.length > 0 ? `***${xTokenHeader.slice(-4)}` : "(none)";
    console.log(
      "[SEPAY_WEBHOOK]",
      JSON.stringify({
        at: new Date().toISOString(),
        ip,
        userAgent: req.headers["user-agent"] ?? null,
        headers: {
          authorization: redactAuthStyleHeader(req.headers.authorization),
          "x-sepay-token": tokenRedacted,
        },
        parse,
        result,
        body: payload,
      }),
    );
  }

  if (!result.ok && result.code === "UNAUTHORIZED") {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  res.status(200).json(result);
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
