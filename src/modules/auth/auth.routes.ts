import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { loginController, logoutController, meController, refreshTokenController, registerController } from "./auth.controller.js";

const authRouter = Router();

authRouter.post("/login", loginController);
authRouter.post("/register", registerController);
authRouter.post("/refresh-token", refreshTokenController);
authRouter.post("/logout", authenticate, logoutController);
authRouter.get("/me", authenticate, meController);

export { authRouter };
