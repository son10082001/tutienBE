import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt.js";
import { isPortalAccessSessionActive } from "../modules/auth/portal-access-session.service.js";

type Role = "ADMIN" | "USER";

type AuthUser = {
  id: string;
  role: Role;
  account: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  void (async () => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Thiếu hoặc sai định dạng access token" });
      return;
    }

    const token = authHeader.split(" ")[1]!;

    try {
      const payload = verifyAccessToken(token);
      if (!payload.jti) {
        res.status(401).json({ message: "Token không hợp lệ" });
        return;
      }
      const active = await isPortalAccessSessionActive(payload.jti, payload.sub);
      if (!active) {
        res.status(401).json({ message: "Phiên đăng nhập đã kết thúc" });
        return;
      }

      req.user = {
        id: payload.sub,
        role: payload.role,
        account: payload.account,
      };

      next();
    } catch {
      res.status(401).json({ message: "Token hết hạn hoặc không hợp lệ" });
    }
  })().catch(next);
}

export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Bạn không có quyền thực hiện thao tác này" });
    }

    return next();
  };
}
