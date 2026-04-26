import { env } from "../../config/env.js";
import { prismaGame } from "../../lib/prisma-game.js";
import { prisma } from "../../lib/prisma.js";
import { getApprovedDepositTotalForUser } from "../deposit/deposit.service.js";
import { buildMailItemsPayload } from "../shop/external-mail-api.js";
import type { CreateTicketConversionInput } from "./ticket-exchange.schema.js";

type TicketConversionDelegate = {
  aggregate: (...args: any[]) => Promise<any>;
  create: (...args: any[]) => Promise<any>;
  findMany: (...args: any[]) => Promise<any>;
  count: (...args: any[]) => Promise<any>;
};

type ServerRow = {
  id: number;
  name: string;
};

type GameCharacterRow = {
  uid: string;
  userId: string;
  serverid: number;
  name: string;
  level: number | null;
};

type VerifyResponse = {
  success: boolean;
  message?: string;
  guid?: string;
};

export type ExchangeServer = {
  id: number;
  name: string;
};

export type ExchangeCharacter = {
  serverId: number;
  uid: string;
  name: string;
  level: number | null;
};

const SELECT_SERVERS_SQL = `
SELECT id, name
FROM configserver
ORDER BY id ASC
`;

const SELECT_USER_CHARACTERS_SQL = `
SELECT uid, userId, serverid, name, level
FROM player
WHERE userId = ?
ORDER BY serverid ASC, level DESC, uid ASC
`;

const SELECT_CHARACTER_BY_SERVER_SQL = `
SELECT uid, userId, serverid, name, level
FROM player
WHERE userId = ? AND serverid = ?
ORDER BY level DESC, uid ASC
LIMIT 1
`;

function buildMailItemsString(itemId: number, quantity: number): string {
  return buildMailItemsPayload([{ itemId, quantity }]);
}

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // noop
  }
  if (!res.ok) {
    const msg = data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

async function sendTicketMail(roleUid: string, tickets: number): Promise<void> {
  const base = env.TICKET_MAIL_API_BASE_URL.replace(/\/$/, "");
  const verifyUrl = `${base}/api/verify`;
  const sendMailUrl = `${base}/api/send-mail`;

  const verify = await postJson<VerifyResponse>(verifyUrl, {
    verifyCode: env.TICKET_MAIL_VERIFY_CODE,
    roleId: roleUid,
  });
  if (!verify.success || !verify.guid) {
    throw new Error(verify.message || "Xác thực nhân vật thất bại");
  }

  const items = buildMailItemsString(env.TICKET_MAIL_ITEM_ID, tickets);
  const send = await postJson<{ success: boolean; message?: string }>(sendMailUrl, {
    guid: verify.guid,
    items,
  });
  if (!send.success) {
    throw new Error(send.message || "Gửi mail phiếu thất bại");
  }
}

function getTicketConversionDelegate(strict: boolean): TicketConversionDelegate | null {
  const model = (prisma as any).ticketConversion as TicketConversionDelegate | undefined;
  if (!model && strict) {
    throw new Error(
      "Hệ thống đổi phiếu chưa sẵn sàng (thiếu model ticketConversion). Vui lòng chạy migrate + prisma:generate rồi restart backend.",
    );
  }
  return model ?? null;
}

export async function listExchangeServers(): Promise<ExchangeServer[]> {
  const rows = await prisma.$queryRawUnsafe<ServerRow[]>(SELECT_SERVERS_SQL);
  return rows.map((row) => ({ id: row.id, name: row.name }));
}

export async function listExchangeCharacters(userId: string): Promise<ExchangeCharacter[]> {
  const rows = await prismaGame.$queryRawUnsafe<GameCharacterRow[]>(SELECT_USER_CHARACTERS_SQL, userId);
  const byServer = new Map<number, ExchangeCharacter>();
  for (const row of rows) {
    if (!byServer.has(row.serverid)) {
      byServer.set(row.serverid, {
        serverId: row.serverid,
        uid: row.uid,
        name: row.name,
        level: row.level,
      });
    }
  }
  return Array.from(byServer.values());
}

export async function getTicketBalance(userId: string): Promise<number> {
  const conversionModel = getTicketConversionDelegate(false);

  let converted = 0;
  if (conversionModel) {
    try {
      const agg = await conversionModel.aggregate({
        where: { userId },
        _sum: { tickets: true },
      });
      converted = agg?._sum?.tickets ?? 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("ticket_conversion")) {
        throw error;
      }
    }
  }

  return Math.max(0, converted);
}

export async function getAvailableBalance(userId: string): Promise<number> {
  const conversionModel = getTicketConversionDelegate(false);
  const approvedTotal = await getApprovedDepositTotalForUser(userId);

  let convertedAmount = 0;
  if (conversionModel) {
    try {
      const agg = await conversionModel.aggregate({
        where: { userId },
        _sum: { amount: true },
      });
      convertedAmount = agg?._sum?.amount ?? 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("ticket_conversion")) {
        throw error;
      }
    }
  }
  let spentByShop = 0;
  const shopOrderModel = (prisma as any).shopOrder as { aggregate: (...args: any[]) => Promise<any> } | undefined;
  if (shopOrderModel) {
    try {
      const agg = await shopOrderModel.aggregate({
        where: { userId },
        _sum: { totalPrice: true },
      });
      spentByShop = agg?._sum?.totalPrice ?? 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("shop_order")) {
        throw error;
      }
    }
  }

  return Math.max(0, approvedTotal - convertedAmount - spentByShop);
}

export async function convertBalanceToTickets(userId: string, input: CreateTicketConversionInput) {
  const rate = env.TICKET_EXCHANGE_RATE;
  const available = await getAvailableBalance(userId);
  if (input.amount > available) {
    throw new Error(`Số dư không đủ (còn ${available})`);
  }

  const tickets = Math.floor(input.amount / rate);
  if (tickets <= 0) {
    throw new Error(`Số tiền tối thiểu để đổi là ${rate}`);
  }

  const effectiveAmount = tickets * rate;
  const characters = await prismaGame.$queryRawUnsafe<GameCharacterRow[]>(
    SELECT_CHARACTER_BY_SERVER_SQL,
    userId,
    input.serverId,
  );
  const player = characters[0];
  if (!player) {
    throw new Error("Tài khoản chưa có nhân vật ở server đã chọn");
  }

  try {
    await sendTicketMail(player.uid, tickets);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gửi mail phiếu thất bại";
    throw new Error(`Đổi phiếu thất bại: ${message}`);
  }

  const conversionModel = getTicketConversionDelegate(true)!;
  try {
    await conversionModel.create({
      data: {
        userId,
        serverId: input.serverId,
        playerUid: player.uid,
        playerName: player.name,
        amount: effectiveAmount,
        tickets,
        conversionRate: rate,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("ticket_conversion")) {
      throw new Error(
        "Hệ thống đổi phiếu chưa sẵn sàng (thiếu bảng ticket_conversion). Vui lòng chạy migrate rồi khởi động lại backend.",
      );
    }
    throw error;
  }

  const [ticketBalanceAfter, balanceAfter] = await Promise.all([
    getTicketBalance(userId),
    getAvailableBalance(userId),
  ]);

  return {
    amount: effectiveAmount,
    tickets,
    conversionRate: rate,
    ticketBalanceAfter,
    balanceAfter,
  };
}
export async function listTicketExchangeHistory(userId: string, page = 1, limit = 10) {
  const model = getTicketConversionDelegate(true)!;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    model.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    model.count({ where: { userId } }),
  ]);
  return { items, total, page, limit };
}
