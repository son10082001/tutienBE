import { prisma } from "../../lib/prisma.js";
import { meService } from "../auth/auth.service.js";
import { sendItemMailByRoleUid } from "../shop/external-mail-api.js";
import { listExchangeCharacters, listExchangeServers } from "../ticket-exchange/ticket-exchange.service.js";
import type { UpdateProfileInput } from "./user.schema.js";

const ADMIN_TYPE = 1;

export async function updateProfileService(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.findUnique({ where: { userId } });
  if (!user) {
    throw new Error("Không tìm thấy tài khoản");
  }

  const newPw = input.newPassword?.trim() ?? "";
  if (newPw.length > 0) {
    if (user.password !== input.currentPassword?.trim()) {
      throw new Error("Mật khẩu hiện tại không đúng");
    }
  }

  const data: {
    name?: string;
    email?: string | null;
    phone?: string | null;
    password?: string;
  } = {};

  if (input.name !== undefined) {
    data.name = input.name.trim();
  }
  if (input.email !== undefined) {
    const e = input.email.trim();
    data.email = e.length > 0 ? e : null;
  }
  if (input.phone !== undefined) {
    const p = input.phone.trim();
    data.phone = p.length > 0 ? p : null;
  }
  if (newPw.length > 0) {
    data.password = newPw;
  }

  if (Object.keys(data).length === 0) {
    throw new Error("Không có thay đổi");
  }

  await prisma.user.update({
    where: { userId },
    data,
  });

  return meService(userId);
}

export async function listUsersService(page = 1, limit = 10, search?: string) {
  const skip = (page - 1) * limit;
  const q = search?.trim();
  const where = q
    ? {
        userId: { contains: q },
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createTime: "desc" },
      skip,
      take: limit,
      select: {
        userId: true,
        type: true,
        createTime: true,
        loginTime: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  const items = rows.map((r) => ({
    userId: r.userId,
    type: r.type,
    role: r.type === ADMIN_TYPE ? ("ADMIN" as const) : ("USER" as const),
    createTime: r.createTime,
    loginTime: r.loginTime,
  }));

  return { items, total, page, limit };
}

export async function getUserGameMetaForAdminService(targetUserId: string) {
  const user = await prisma.user.findUnique({ where: { userId: targetUserId }, select: { userId: true } });
  if (!user) {
    throw new Error("Không tìm thấy người dùng");
  }
  const [servers, characters] = await Promise.all([listExchangeServers(), listExchangeCharacters(targetUserId)]);
  return { servers, characters };
}

export async function adminSendItemMailToUserService(
  targetUserId: string,
  input: { serverId: number; items: Array<{ externalItemId: number; quantity: number }> },
) {
  const character = (await listExchangeCharacters(targetUserId)).find((c) => c.serverId === input.serverId);
  if (!character) {
    throw new Error("Tài khoản chưa có nhân vật ở server đã chọn");
  }
  for (const item of input.items) {
    await sendItemMailByRoleUid(character.uid, item.externalItemId, item.quantity);
  }
  return { message: `Đã gửi ${input.items.length} vật phẩm vào hộp thư trong game` };
}

export async function deleteUserService(actorUserId: string, targetUserId: string) {
  if (actorUserId === targetUserId) {
    throw new Error("Không thể xóa chính tài khoản đang đăng nhập");
  }

  const target = await prisma.user.findUnique({ where: { userId: targetUserId } });
  if (!target) {
    throw new Error("Không tìm thấy người dùng");
  }
  if (target.type === ADMIN_TYPE) {
    throw new Error("Không thể xóa tài khoản quản trị viên");
  }

  await prisma.$transaction([
    prisma.portalAccessSession.deleteMany({ where: { userId: targetUserId } }),
    prisma.depositRequest.deleteMany({ where: { userId: targetUserId } }),
    prisma.user.delete({ where: { userId: targetUserId } }),
  ]);
}
