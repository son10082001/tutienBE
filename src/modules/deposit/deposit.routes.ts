import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import {
  createDepositController,
  getDepositOptionsController,
  getMyDepositsController,
} from "./deposit.controller.js";
import { getActiveDepositPromotionController } from "./deposit-promotion.controller.js";

const depositRouter = Router();

// User routes — yêu cầu đăng nhập
depositRouter.post("/request", authenticate, (req, res, next) => {
  createDepositController(req, res).catch(next);
});

depositRouter.get("/my", authenticate, (req, res, next) => {
  getMyDepositsController(req, res).catch(next);
});

depositRouter.get("/promotion", authenticate, (req, res, next) => {
  getActiveDepositPromotionController(req, res).catch(next);
});

depositRouter.get("/options", authenticate, (req, res, next) => {
  getDepositOptionsController(req, res).catch(next);
});

export { depositRouter };
