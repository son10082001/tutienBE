import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type JwtPayload = {
  sub: string;
  role: "ADMIN" | "USER";
  account: string;
  adminRole?: "SUPERADMIN" | "OPERATOR" | "ADVERTISER";
  permissions?: string[];
  /** Session id lưu DB (`portal_access_session`); mọi request access phải còn hiệu lực. */
  jti: string;
};

export type RefreshJwtPayload = {
  sub: string;
  role: "ADMIN" | "USER";
  account: string;
};

export function signAccessToken(payload: JwtPayload): string {
  const expiresIn = env.ACCESS_TOKEN_EXPIRES_IN as jwt.SignOptions["expiresIn"];
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn,
  });
}

export function signRefreshToken(payload: RefreshJwtPayload): string {
  const expiresIn = env.REFRESH_TOKEN_EXPIRES_IN as jwt.SignOptions["expiresIn"];
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): RefreshJwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshJwtPayload;
}
