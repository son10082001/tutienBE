import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import {
  createTicketConversionSchema,
  historyTicketExchangeQuerySchema,
} from "./ticket-exchange.schema.js";
import {
  convertBalanceToTickets,
  getAvailableBalance,
  getTicketBalance,
  listExchangeCharacters,
  listExchangeServers,
  listTicketExchangeHistory,
} from "./ticket-exchange.service.js";

export async function getTicketExchangeMetaController(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const [ticketBalance, balance, servers, characters] = await Promise.all([
    getTicketBalance(userId),
    getAvailableBalance(userId),
    listExchangeServers(),
    listExchangeCharacters(userId),
  ]);
  res.json({
    rate: env.TICKET_EXCHANGE_RATE,
    ticketBalance,
    balance,
    servers,
    characters,
  });
}

export async function createTicketConversionController(req: Request, res: Response): Promise<void> {
  const parsed = createTicketConversionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  try {
    const row = await convertBalanceToTickets(req.user!.id, parsed.data);
    res.status(201).json(row);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Đổi tiền sang phiếu thất bại";
    res.status(400).json({ message });
  }
}

export async function getTicketExchangeHistoryController(req: Request, res: Response): Promise<void> {
  const parsed = historyTicketExchangeQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: "Query không hợp lệ", errors: parsed.error.flatten() });
    return;
  }
  const result = await listTicketExchangeHistory(req.user!.id, parsed.data.page, parsed.data.limit);
  res.json(result);
}
