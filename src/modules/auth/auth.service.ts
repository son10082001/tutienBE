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
    throw new Error("userId or password is incorrect");
  }

  const isPasswordMatched = user.password === input.password;

  if (!isPasswordMatched) {
    throw new Error("userId or password is incorrect");
  }

  const role = resolveRoleByType(user.type);

  await revokeAllPortalAccessSessionsForUser(user.userId);
  const jti = newPortalJti();
  await createPortalAccessSession(user.userId, jti, nextAccessTokenExpiry());

  const payload = {
    sub: user.userId,
    role,
    account: user.userId,
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
    },
    accessToken,
    refreshToken,
  };
}

export async function refreshAccessTokenService(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);

  const user = await prisma.user.findUnique({ where: { userId: payload.sub } });
  if (!user) {
    throw new Error("Invalid refresh token");
  }

  const role = resolveRoleByType(user.type);

  await revokeAllPortalAccessSessionsForUser(user.userId);
  const jti = newPortalJti();
  await createPortalAccessSession(user.userId, jti, nextAccessTokenExpiry());

  return signAccessToken({
    sub: user.userId,
    role,
    account: user.userId,
    jti,
  });
}

export async function registerService(input: RegisterInput) {
  const userId = input.email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({ where: { userId } });
  if (existingUser) {
    throw new Error("user already exists");
  }

  await prisma.$executeRaw`
    INSERT INTO user (userId, password, name, type, serverId, lastLoginServerId)
    VALUES (${userId}, ${input.password}, ${input.name}, 0, 0, 0)
  `;
}

export async function meService(userId: string) {
  const user = await prisma.user.findUnique({ where: { userId } });
  if (!user) {
    throw new Error("User not found");
  }

  const role = resolveRoleByType(user.type);

  return {
    id: user.userId,
    userId: user.userId,
    name: user.name,
    type: user.type,
    role,
  };
}

export async function logoutService(userId: string) {
  await revokeAllPortalAccessSessionsForUser(userId);
}
