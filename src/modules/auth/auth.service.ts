import { randomBytes } from "node:crypto";
import { env } from "../../config/env.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/jwt.js";
import { prisma } from "../../lib/prisma.js";
import { parseJwtExpiresInMs } from "./jwt-expiry.js";
import {
  createPortalAccessSession,
  revokeAllPortalAccessSessionsForUser,
} from "./portal-access-session.service.js";
import { LoginInput, RegisterInput } from "./auth.schema.js";
import { computeVipInfo } from "../user/vip.js";
import {
  getAvailableBalance,
  getTicketBalance,
} from "../ticket-exchange/ticket-exchange.service.js";
import { getOrCreateAdminAccess } from "../admin/admin-access.service.js";

function resolveRoleByType(type: number): "ADMIN" | "USER" {
  return type === 1 ? "ADMIN" : "USER";
}

function nextAccessTokenExpiry(): Date {
  const ms = parseJwtExpiresInMs(env.ACCESS_TOKEN_EXPIRES_IN);
  return new Date(Date.now() + ms);
}

function newPortalJti(): string {
  return randomBytes(32).toString("hex");
}

export async function loginService(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { userId: input.userId } });

  if (!user) {
    throw new Error("Tên đăng nhập hoặc mật khẩu không đúng");
  }

  const isPasswordMatched = user.password === input.password;

  if (!isPasswordMatched) {
    throw new Error("Tên đăng nhập hoặc mật khẩu không đúng");
  }

  const role = resolveRoleByType(user.type);
  const adminAccess = role === "ADMIN" ? await getOrCreateAdminAccess(user.userId) : null;

  await revokeAllPortalAccessSessionsForUser(user.userId);
  const jti = newPortalJti();
  await createPortalAccessSession(user.userId, jti, nextAccessTokenExpiry());

  const payload = {
    sub: user.userId,
    role,
    account: user.userId,
    adminRole: adminAccess?.role,
    permissions: adminAccess?.permissions ?? [],
    jti,
  } as const;

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({
    sub: user.userId,
    role,
    account: user.userId,
  });

  return {
    user: {
      id: user.userId,
      userId: user.userId,
      name: user.name,
      type: user.type,
      role,
      adminRole: adminAccess?.role ?? null,
      permissions: adminAccess?.permissions ?? [],
    },
    accessToken,
    refreshToken,
  };
}

export async function refreshAccessTokenService(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);

  const user = await prisma.user.findUnique({ where: { userId: payload.sub } });
  if (!user) {
    throw new Error("Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại");
  }

  const role = resolveRoleByType(user.type);
  const adminAccess = role === "ADMIN" ? await getOrCreateAdminAccess(user.userId) : null;

  await revokeAllPortalAccessSessionsForUser(user.userId);
  const jti = newPortalJti();
  await createPortalAccessSession(user.userId, jti, nextAccessTokenExpiry());

  return signAccessToken({
    sub: user.userId,
    role,
    account: user.userId,
    adminRole: adminAccess?.role,
    permissions: adminAccess?.permissions ?? [],
    jti,
  });
}

export async function registerService(input: RegisterInput) {
  const userId = input.userId.trim();

  const existingUser = await prisma.user.findUnique({ where: { userId } });
  if (existingUser) {
    throw new Error("Tài khoản đã tồn tại");
  }

  const name = userId.length <= 24 ? userId : userId.slice(0, 24);

  await prisma.$executeRaw`
    INSERT INTO user (userId, password, name, type, serverId, lastLoginServerId)
    VALUES (${userId}, ${input.password}, ${name}, 0, 0, 0)
  `;
}

export async function meService(userId: string) {
  const user = await prisma.user.findUnique({ where: { userId } });
  if (!user) {
    throw new Error("Không tìm thấy tài khoản");
  }

  const role = resolveRoleByType(user.type);
  const adminAccess = role === "ADMIN" ? await getOrCreateAdminAccess(user.userId) : null;

  // Tính tổng tiền đã nạp thành công (status = approved)
  const approvedDeposits = await prisma.depositRequest.findMany({
    where: { userId, status: "approved" },
    select: { amount: true, bonusAmount: true },
  });
  const approvedTotal = approvedDeposits.reduce((sum, d) => sum + d.amount + d.bonusAmount, 0);
  const [vip, ticketBalance, balance] = await Promise.all([
    Promise.resolve(computeVipInfo(approvedTotal)),
    getTicketBalance(userId),
    getAvailableBalance(userId),
  ]);

  return {
    id: user.userId,
    userId: user.userId,
    name: user.name,
    email: user.email ?? null,
    phone: user.phone ?? null,
    type: user.type,
    role,
    adminRole: adminAccess?.role ?? null,
    permissions: adminAccess?.permissions ?? [],
    balance,
    ticketBalance,
    vipLevel: vip.vipLevel,
    vipLabel: vip.vipLabel,
    nextVipLevel: vip.nextVipLevel,
    amountToNextVip: vip.amountToNextVip,
  };
}

export async function logoutService(userId: string) {
  await revokeAllPortalAccessSessionsForUser(userId);
}
