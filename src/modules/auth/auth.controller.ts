import { Request, Response } from "express";
import { loginSchema, registerSchema } from "./auth.schema.js";
import { loginService, logoutService, meService, refreshAccessTokenService, registerService } from "./auth.service.js";

const REFRESH_COOKIE_NAME = "refreshToken";

export async function loginController(req: Request, res: Response) {
  try {
    const parsed = loginSchema.parse(req.body);
    const data = await loginService(parsed);

    res.cookie(REFRESH_COOKIE_NAME, data.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      user: data.user,
      accessToken: data.accessToken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return res.status(401).json({ message });
  }
}

export async function refreshTokenController(req: Request, res: Response) {
  try {
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token is required" });
    }

    const accessToken = await refreshAccessTokenService(refreshToken);
    return res.status(200).json({ accessToken });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot refresh token";
    return res.status(401).json({ message });
  }
}

export async function logoutController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await logoutService(req.user.id);
    res.clearCookie(REFRESH_COOKIE_NAME);

    return res.status(200).json({ message: "Logout successful" });
  } catch {
    return res.status(500).json({ message: "Logout failed" });
  }
}

export async function registerController(req: Request, res: Response) {
  try {
    const parsed = registerSchema.parse(req.body);
    await registerService(parsed);
    return res.status(201).json({ message: "Register successful" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Register failed";
    return res.status(400).json({ message });
  }
}

export async function meController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await meService(req.user.id);
    return res.status(200).json(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot get user profile";
    return res.status(400).json({ message });
  }
}
