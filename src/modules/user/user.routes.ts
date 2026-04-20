import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { updateProfileController } from "./user.controller.js";

const userRouter = Router();

userRouter.get("/profile", authenticate, authorize("USER", "ADMIN"), (req, res) => {
  return res.status(200).json({
    message: "Thông tin hồ sơ",
    user: req.user,
  });
});

userRouter.patch("/profile", authenticate, authorize("USER", "ADMIN"), (req, res, next) => {
  updateProfileController(req, res).catch(next);
});

export { userRouter };
