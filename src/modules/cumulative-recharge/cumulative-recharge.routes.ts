import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import {
  claimCumulativeRechargeController,
  getCumulativeRechargeUserStateController,
} from "./cumulative-recharge.controller.js";

const cumulativeRechargeRouter = Router();

cumulativeRechargeRouter.get("/state", authenticate, (req, res, next) => {
  getCumulativeRechargeUserStateController(req, res).catch(next);
});

cumulativeRechargeRouter.post("/claim", authenticate, (req, res, next) => {
  claimCumulativeRechargeController(req, res).catch(next);
});

export { cumulativeRechargeRouter };
