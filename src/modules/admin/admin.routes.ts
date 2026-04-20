import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import {
  getAllDepositsController,
  approveDepositController,
  rejectDepositController,
  updateDepositAdminController,
} from "../deposit/deposit.controller.js";
import {
  createDepositPromotionAdminController,
  listDepositPromotionsAdminController,
  patchDepositPromotionAdminController,
} from "../deposit/deposit-promotion.controller.js";
import { deleteUserAdminController, listUsersAdminController } from "../user/user.controller.js";

const adminRouter = Router();

adminRouter.get("/dashboard", authenticate, authorize("ADMIN"), (req, res) => {
  return res.status(200).json({ message: "Chào mừng đến bảng quản trị", user: req.user });
});

// ─── Quản lý người dùng ───────────────────────────────────────────────────────

adminRouter.get("/users", authenticate, authorize("ADMIN"), (req, res, next) => {
  listUsersAdminController(req, res).catch(next);
});

adminRouter.delete("/users/:userId", authenticate, authorize("ADMIN"), (req, res, next) => {
  deleteUserAdminController(req, res).catch(next);
});

// ─── Deposit management ────────────────────────────────────────────────────────

adminRouter.get("/deposits", authenticate, authorize("ADMIN"), (req, res, next) => {
  getAllDepositsController(req, res).catch(next);
});

adminRouter.patch("/deposits/:id/approve", authenticate, authorize("ADMIN"), (req, res, next) => {
  approveDepositController(req, res).catch(next);
});

adminRouter.patch("/deposits/:id/reject", authenticate, authorize("ADMIN"), (req, res, next) => {
  rejectDepositController(req, res).catch(next);
});

adminRouter.patch("/deposits/:id", authenticate, authorize("ADMIN"), (req, res, next) => {
  updateDepositAdminController(req, res).catch(next);
});

// ─── Khuyến mãi nạp tiền ───────────────────────────────────────────────────────

adminRouter.get("/deposit-promotions", authenticate, authorize("ADMIN"), (req, res, next) => {
  listDepositPromotionsAdminController(req, res).catch(next);
});

adminRouter.post("/deposit-promotions", authenticate, authorize("ADMIN"), (req, res, next) => {
  createDepositPromotionAdminController(req, res).catch(next);
});

adminRouter.patch("/deposit-promotions/:id", authenticate, authorize("ADMIN"), (req, res, next) => {
  patchDepositPromotionAdminController(req, res).catch(next);
});

export { adminRouter };
