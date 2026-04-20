import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";

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
  const { name, channel, generateCount, expiryDate, bonusesStr, vipLevel = 0, useType = "0" } = params;

  // 1. Determine batch ID
  const lastBatch = await prisma.activationcodeinfo.findFirst({
    orderBy: { id: "desc" },
    select: { id: true },
  });

  const batch = (lastBatch?.id || 0) + 1;
  const addFlag = 1; // Default for new batch

  // 2. Prepare generation tokens
  const startBatchStr = T_ACTIVATION_CODE[Math.floor(batch / COUNT) % COUNT];
  const endBatchStr = T_ACTIVATION_CODE[batch % COUNT];
  const addFlagStr = T_ACTIVATION_CODE[addFlag % COUNT];

  const generateSingleCode = () => {
    let result = "";
    for (let i = 0; i < 15; i++) {
      if (i === 6) { // Lua position 7
        result += startBatchStr;
      } else if (i === 8) { // Lua position 9
        result += endBatchStr;
      } else if (i === 10) { // Lua position 11
        result += addFlagStr;
      } else {
        const randomIndex = Math.floor(Math.random() * COUNT);
        result += T_ACTIVATION_CODE[randomIndex];
      }
    }
    return result;
  };

  const codes: string[] = [];
  const activationCodeData: any[] = [];

  for (let i = 1; i <= generateCount; i++) {
    const code = generateSingleCode();
    codes.push(code);

    // Lua: string.format("%04X%02X%06X", batchEx, addFlag, index)
    const idEx = 
      batch.toString(16).toUpperCase().padStart(4, '0') +
      addFlag.toString(16).toUpperCase().padStart(2, '0') +
      i.toString(16).toUpperCase().padStart(6, '0');

    activationCodeData.push({
      id: idEx,
      batch: batch,
      code: code,
    });
  }

  // 3. Insert into database
  await prisma.$transaction([
    prisma.activationcodeinfo.create({
      data: {
        id: batch,
        name,
        channel,
        vipLevel,
        bonusesStr,
        expiryDate: new Date(expiryDate),
        useType,
        addFlag,
      },
    }),
    prisma.activationcode.createMany({
      data: activationCodeData,
    }),
  ]);

  return codes;
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
  const { code, roleId } = params;

  // 1. Tìm gift code
  const ac = await prisma.activationcode.findFirst({
    where: { code },
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

  // 4. Kiểm tra giới hạn sử dụng theo useType
  // 0: Một mã dùng 1 lần duy nhất (ai dùng cũng được nhưng chỉ 1 lần)
  // 1: Một nhân vật chỉ được dùng 1 mã trong cùng 1 batch
  if (aci.useType === "0") {
    const used = await prisma.useactivationcoderecord.findFirst({
      where: { code },
    });
    if (used) {
      throw new Error("Mã gift code này đã được sử dụng");
    }
  } else if (aci.useType === "1") {
    const used = await prisma.useactivationcoderecord.findFirst({
      where: { playerId: roleId, batch: ac.batch },
    });
    if (used) {
      throw new Error("Nhân vật của bạn đã nhận quà từ đợt này rồi");
    }
  }

  // 5. Gửi vật phẩm qua API bên ngoài (theo mẫu sendTicketMail)
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

  // 6. Ghi nhận lịch sử sử dụng
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
      code: code,
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

export const listGiftCodeBatchesService = async () => {
  return prisma.activationcodeinfo.findMany({
    orderBy: { id: "desc" },
  });
};

export const getGiftCodeBatchCodesService = async (batchId: number) => {
  const codes = await prisma.activationcode.findMany({
    where: { batch: batchId },
    select: { code: true },
  });
  return codes.map((c: { code: string }) => c.code);
};
