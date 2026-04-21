import { Router } from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { getAdminDashboardStatsController } from "./admin.controller.js";
import {
  createDepositPromotionAdminController,
  listDepositPromotionsAdminController,
  patchDepositPromotionAdminController,
} from "../deposit/deposit-promotion.controller.js";
import {
  approveDepositController,
  getAllDepositsController,
  rejectDepositController,
  updateDepositAdminController,
} from "../deposit/deposit.controller.js";
import {
  createGiftCodeController,
  deleteGiftCodeBatchController,
  getGiftCodeBatchCodesController,
  getGiftCodeItemsController,
  listGiftCodeBatchesController,
  updateGiftCodeBatchController,
} from "../gift-code/gift-code.controller.js";
import {
  createShopItemController,
  deleteShopItemController,
  listExternalItemsController,
  listShopItemsAdminController,
  updateShopItemController,
  uploadShopImageController,
} from "../shop/shop.controller.js";
import { deleteUserAdminController, listUsersAdminController } from "../user/user.controller.js";

const adminRouter = Router();
const shopUploadDir = path.join(process.cwd(), "uploads", "shop");
const shopUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(shopUploadDir, { recursive: true });
      cb(null, shopUploadDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".png";
      cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
    },
  }),
});

adminRouter.get("/dashboard", authenticate, authorize("ADMIN"), (req, res) => {
  return res.status(200).json({ message: "Chào mừng đến bảng quản trị", user: req.user });
});

adminRouter.get("/dashboard/stats", authenticate, authorize("ADMIN"), (req, res, next) => {
  getAdminDashboardStatsController(req, res).catch(next);
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

// ─── Shop management ──────────────────────────────────────────────────────────

adminRouter.get("/shop/items", authenticate, authorize("ADMIN"), (req, res, next) => {
  listShopItemsAdminController(req, res).catch(next);
});

adminRouter.get("/shop/external-items", authenticate, authorize("ADMIN"), (req, res, next) => {
  listExternalItemsController(req, res).catch(next);
});

adminRouter.post(
  "/shop/upload-image",
  authenticate,
  authorize("ADMIN"),
  shopUpload.single("image"),
  (req, res, next) => {
    uploadShopImageController(req, res).catch(next);
  },
);

adminRouter.post("/shop/items", authenticate, authorize("ADMIN"), (req, res, next) => {
  createShopItemController(req, res).catch(next);
});

adminRouter.patch("/shop/items/:id", authenticate, authorize("ADMIN"), (req, res, next) => {
  updateShopItemController(req, res).catch(next);
});

adminRouter.delete("/shop/items/:id", authenticate, authorize("ADMIN"), (req, res, next) => {
  deleteShopItemController(req, res).catch(next);
});

// ─── Gift Code management ──────────────────────────────────────────────────────

adminRouter.post("/gift-codes", authenticate, authorize("ADMIN"), (req, res, next) => {
  createGiftCodeController(req, res).catch(next);
});

adminRouter.get("/gift-codes/items", authenticate, authorize("ADMIN"), (req, res, next) => {
  getGiftCodeItemsController(req, res).catch(next);
});

adminRouter.get("/gift-codes", authenticate, authorize("ADMIN"), (req, res, next) => {
  listGiftCodeBatchesController(req, res).catch(next);
});

adminRouter.get("/gift-codes/:id/codes", authenticate, authorize("ADMIN"), (req, res, next) => {
  getGiftCodeBatchCodesController(req, res).catch(next);
});

adminRouter.patch("/gift-codes/:id", authenticate, authorize("ADMIN"), (req, res, next) => {
  updateGiftCodeBatchController(req, res).catch(next);
});

adminRouter.delete("/gift-codes/:id", authenticate, authorize("ADMIN"), (req, res, next) => {
  deleteGiftCodeBatchController(req, res).catch(next);
});

export { adminRouter };
