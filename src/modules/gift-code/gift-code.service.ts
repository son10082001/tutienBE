import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import type { ListGiftCodeBatchesQueryInput, UpdateGiftCodeBatchInput } from "./gift-code.schema.js";

const T_ACTIVATION_CODE = [
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
  "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T",
  "U", "V", "W", "X", "Y", "Z"
];

const COUNT = T_ACTIVATION_CODE.length;

export interface GiftCodeCreateParams {
  name: string;
  channel: string;
  generateCount: number;
  expiryDate: string;
  bonusesStr: string;
  vipLevel?: number;
  useType?: string;
}

export const createGiftCodesService = async (params: GiftCodeCreateParams) => {
  const { name, channel, generateCount, expiryDate, bonusesStr, useType = "0" } = params;
  const codeName = name.trim().toUpperCase();
  if (!codeName) {
    throw new Error("Tên gift code không được để trống");
  }

  // 1. Determine batch ID
  const lastBatch = await prisma.activationcodeinfo.findFirst({
    orderBy: { id: "desc" },
    select: { id: true },
  });

  const batch = (lastBatch?.id || 0) + 1;
  const addFlag = 1; // Default for new batch
  const existedCode = await prisma.activationcode.findFirst({
    where: { code: codeName },
    select: { id: true },
  });
  if (existedCode) {
    throw new Error("Tên gift code đã tồn tại, vui lòng dùng tên khác");
  }

  // 2. Prepare generation tokens
  const startBatchStr = T_ACTIVATION_CODE[Math.floor(batch / COUNT) % COUNT];
  const endBatchStr = T_ACTIVATION_CODE[batch % COUNT];
  const addFlagStr = T_ACTIVATION_CODE[addFlag % COUNT];

  // Chỉ tạo 1 mã duy nhất, mã này chính là tên gift code.
  const idEx =
    batch.toString(16).toUpperCase().padStart(4, "0") +
    addFlag.toString(16).toUpperCase().padStart(2, "0") +
    "000001";

  // 3. Insert into database
  await prisma.$transaction([
    prisma.activationcodeinfo.create({
      data: {
        id: batch,
        name: codeName,
        channel,
        // Dùng cột vipLevel để lưu giới hạn số lượt dùng của mã.
        vipLevel: generateCount,
        bonusesStr,
        expiryDate: new Date(expiryDate),
        useType,
        addFlag,
      },
    }),
    prisma.activationcode.create({
      data: {
        id: idEx,
        batch,
        code: codeName,
      },
    }),
  ]);

  return [codeName];
};

export interface RedeemGiftCodeParams {
  code: string;
  roleId: string;
  serverId: number;
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

export const redeemGiftCodeService = async (params: RedeemGiftCodeParams) => {
  const { code, roleId, serverId } = params;
  const normalizedCode = code.trim().toUpperCase();

  // 1. Tìm gift code
  const ac = await prisma.activationcode.findFirst({
    where: { code: normalizedCode },
  });

  if (!ac) {
    throw new Error("Mã gift code không hợp lệ hoặc không tồn tại");
  }

  // 2. Tìm thông tin đợt phát code
  const aci = await prisma.activationcodeinfo.findUnique({
    where: { id: ac.batch },
  });

  if (!aci) {
    throw new Error("Không tìm thấy thông tin đợt quà tặng");
  }

  // 3. Kiểm tra hạn sử dụng
  if (new Date() > aci.expiryDate) {
    throw new Error("Mã gift code đã hết hạn sử dụng");
  }

  // 4. Kiểm tra kênh server
  if (aci.channel !== "all" && aci.channel !== String(serverId)) {
    throw new Error("Mã gift code này không áp dụng cho server đã chọn");
  }

  // 5. Giới hạn số lượt dùng của mã (lưu trong vipLevel)
  const usedByThisRole = await prisma.useactivationcoderecord.findFirst({
    where: {
      playerId: roleId,
      batch: ac.batch,
    },
    select: { id: true },
  });
  if (usedByThisRole) {
    throw new Error("Nhân vật này đã nhận gift code này rồi");
  }

  const usedCount = await prisma.useactivationcoderecord.count({
    where: { batch: ac.batch },
  });
  if (usedCount >= aci.vipLevel) {
    throw new Error("Mã gift code đã hết lượt sử dụng");
  }

  // 6. Gửi vật phẩm qua API bên ngoài (theo mẫu sendTicketMail)
  const base = env.TICKET_MAIL_API_BASE_URL.replace(/\/$/, "");
  const verifyUrl = `${base}/api/verify`;
  const sendMailUrl = `${base}/api/send-mail`;

  // Verify nhân vật để lấy guid
  const verify = await postJson<{ success: boolean; guid?: string; message?: string }>(verifyUrl, {
    verifyCode: env.TICKET_MAIL_VERIFY_CODE,
    roleId: roleId,
  });

  if (!verify.success || !verify.guid) {
    throw new Error(verify.message || "Xác thực nhân vật thất bại");
  }

  // Chuẩn bị chuỗi vật phẩm (chuyển 2:1: thành 4:2:)
  const items = aci.bonusesStr.replace(/^2:1:/, "4:2:");

  const send = await postJson<{ success: boolean; message?: string }>(sendMailUrl, {
    guid: verify.guid,
    items,
  });

  if (!send.success) {
    throw new Error(send.message || "Gửi phần thưởng thất bại");
  }

  // 7. Ghi nhận lịch sử sử dụng
  // Lấy ID tự tăng tiếp theo (tạm thời increment dựa trên MAX ID nếu cần, 
  // hoặc để tự động nếu schema hỗ trợ, nhưng schema .prisma hnay tôi thấy @id Int)
  const lastRecord = await prisma.useactivationcoderecord.findFirst({
    orderBy: { id: "desc" },
    select: { id: true },
  });
  const nextId = (lastRecord?.id || 0) + 1;

  await prisma.useactivationcoderecord.create({
    data: {
      id: nextId,
      playerId: roleId,
      batch: ac.batch,
      code: normalizedCode,
      createTime: new Date(),
    },
  });

  return { message: "Nhận quà thành công! Vui lòng kiểm tra hộp thư trong game." };
};

export const getGiftCodeItemsService = async () => {
  const base = env.TICKET_MAIL_API_BASE_URL.replace(/\/$/, "");
  const url = `${base}/api/items`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } catch (error: any) {
    console.error("Error fetching gift code items:", error);
    throw new Error("Không thể lấy danh sách vật phẩm từ máy chủ.");
  }
};

export const listGiftCodeBatchesService = async (query: ListGiftCodeBatchesQueryInput) => {
  const where = query.search
    ? {
        OR: [
          { name: { contains: query.search } },
          { id: Number.isFinite(Number(query.search)) ? Number(query.search) : -1 },
        ],
      }
    : {};

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    prisma.activationcodeinfo.findMany({
      where,
      orderBy: { id: "desc" },
      skip,
      take: query.limit,
    }),
    prisma.activationcodeinfo.count({ where }),
  ]);

  const batchIds = items.map((it: { id: number }) => it.id);
  const usedCounts = batchIds.length
    ? await prisma.useactivationcoderecord.groupBy({
        by: ["batch"],
        where: { batch: { in: batchIds } },
        _count: { _all: true },
      })
    : [];
  const usedByBatch = new Map<number, number>(
    usedCounts.map((row: { batch: number; _count: { _all: number } }) => [row.batch, row._count._all]),
  );

  const itemsWithUsage = items.map((item: { id: number; vipLevel: number }) => ({
    ...item,
    usedCount: usedByBatch.get(item.id) ?? 0,
    totalAllowed: item.vipLevel,
  }));

  return {
    items: itemsWithUsage,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
};

export const getGiftCodeBatchCodesService = async (batchId: number) => {
  const codes = await prisma.activationcode.findMany({
    where: { batch: batchId },
    select: { code: true },
  });
  return codes.map((c: { code: string }) => c.code);
};

export const updateGiftCodeBatchService = async (batchId: number, input: UpdateGiftCodeBatchInput) => {
  return prisma.activationcodeinfo.update({
    where: { id: batchId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.channel !== undefined && { channel: input.channel }),
      ...(input.expiryDate !== undefined && { expiryDate: new Date(input.expiryDate) }),
      ...(input.bonusesStr !== undefined && { bonusesStr: input.bonusesStr }),
      ...(input.vipLevel !== undefined && { vipLevel: input.vipLevel }),
      ...(input.useType !== undefined && { useType: input.useType }),
    },
  });
};

export const deleteGiftCodeBatchService = async (batchId: number) => {
  await prisma.$transaction([
    prisma.useactivationcoderecord.deleteMany({ where: { batch: batchId } }),
    prisma.activationcode.deleteMany({ where: { batch: batchId } }),
    prisma.activationcodeinfo.delete({ where: { id: batchId } }),
  ]);
};
