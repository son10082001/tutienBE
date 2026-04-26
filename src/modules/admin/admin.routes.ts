import { Router } from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { authenticate, authorize, authorizePermission } from "../../middlewares/auth.middleware.js";
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
  createCumulativeRechargeMilestoneController,
  deleteCumulativeRechargeMilestoneController,
  listCumulativeRechargeMilestonesAdminController,
  updateCumulativeRechargeMilestoneController,
} from "../cumulative-recharge/cumulative-recharge.controller.js";
import {
  createShopItemController,
  deleteShopItemController,
  listExternalItemsController,
  listShopItemsAdminController,
  updateShopItemController,
  uploadShopImageController,
} from "../shop/shop.controller.js";
import {
  adminSendItemMailController,
  deleteUserAdminController,
  getUserGameMetaAdminController,
  listUsersAdminController,
} from "../user/user.controller.js";
import {
  createAdminAccountController,
  createGameServerController,
  deleteAdminAccountController,
  deleteGameServerController,
  listAdminAccountsController,
  listAdminSettingsController,
  updateAdminAccountController,
  updatePaymentMethodConfigController,
  updateRolePermissionController,
} from "./admin-settings.controller.js";
import { adminSupportRouter } from "../support/support.routes.js";

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

adminRouter.get("/dashboard", authenticate, authorize("ADMIN"), authorizePermission("dashboard.view"), (req, res) => {
  return res.status(200).json({ message: "Chào mừng đến bảng quản trị", user: req.user });
});

adminRouter.get(
  "/dashboard/stats",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("dashboard.view", "reports.view"),
  (req, res, next) => {
  getAdminDashboardStatsController(req, res).catch(next);
  },
);

// ─── Quản lý người dùng ───────────────────────────────────────────────────────

adminRouter.get("/users", authenticate, authorize("ADMIN"), authorizePermission("users.view"), (req, res, next) => {
  listUsersAdminController(req, res).catch(next);
});

adminRouter.get(
  "/users/:userId/game-meta",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("users.view"),
  (req, res, next) => {
    getUserGameMetaAdminController(req, res).catch(next);
  },
);

adminRouter.post(
  "/users/:userId/send-item-mail",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("users.view"),
  authorizePermission("shop.manage"),
  (req, res, next) => {
    adminSendItemMailController(req, res).catch(next);
  },
);

adminRouter.delete(
  "/users/:userId",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("users.delete"),
  (req, res, next) => {
  deleteUserAdminController(req, res).catch(next);
  },
);

// ─── Deposit management ────────────────────────────────────────────────────────

adminRouter.get(
  "/deposits",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("deposits.view"),
  (req, res, next) => {
  getAllDepositsController(req, res).catch(next);
  },
);

adminRouter.patch(
  "/deposits/:id/approve",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("deposits.approve"),
  (req, res, next) => {
  approveDepositController(req, res).catch(next);
  },
);

adminRouter.patch(
  "/deposits/:id/reject",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("deposits.approve"),
  (req, res, next) => {
  rejectDepositController(req, res).catch(next);
  },
);

adminRouter.patch(
  "/deposits/:id",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("deposits.edit"),
  (req, res, next) => {
  updateDepositAdminController(req, res).catch(next);
  },
);

// ─── Khuyến mãi nạp tiền ───────────────────────────────────────────────────────

adminRouter.get(
  "/deposit-promotions",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("promotions.manage"),
  (req, res, next) => {
  listDepositPromotionsAdminController(req, res).catch(next);
  },
);

adminRouter.post(
  "/deposit-promotions",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("promotions.manage"),
  (req, res, next) => {
  createDepositPromotionAdminController(req, res).catch(next);
  },
);

adminRouter.patch(
  "/deposit-promotions/:id",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("promotions.manage"),
  (req, res, next) => {
  patchDepositPromotionAdminController(req, res).catch(next);
  },
);

// ─── Tích nạp (mốc nạp + quà) ─────────────────────────────────────────────────

adminRouter.get(
  "/cumulative-recharge/milestones",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("promotions.manage"),
  (req, res, next) => {
    listCumulativeRechargeMilestonesAdminController(req, res).catch(next);
  },
);

adminRouter.post(
  "/cumulative-recharge/milestones",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("promotions.manage"),
  (req, res, next) => {
    createCumulativeRechargeMilestoneController(req, res).catch(next);
  },
);

adminRouter.patch(
  "/cumulative-recharge/milestones/:id",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("promotions.manage"),
  (req, res, next) => {
    updateCumulativeRechargeMilestoneController(req, res).catch(next);
  },
);

adminRouter.delete(
  "/cumulative-recharge/milestones/:id",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("promotions.manage"),
  (req, res, next) => {
    deleteCumulativeRechargeMilestoneController(req, res).catch(next);
  },
);

// ─── Shop management ──────────────────────────────────────────────────────────

adminRouter.get("/shop/items", authenticate, authorize("ADMIN"), authorizePermission("shop.manage"), (req, res, next) => {
  listShopItemsAdminController(req, res).catch(next);
});

adminRouter.get(
  "/shop/external-items",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("shop.manage"),
  (req, res, next) => {
  listExternalItemsController(req, res).catch(next);
  },
);

adminRouter.post(
  "/shop/upload-image",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("shop.manage"),
  shopUpload.single("image"),
  (req, res, next) => {
    uploadShopImageController(req, res).catch(next);
  },
);

adminRouter.post("/shop/items", authenticate, authorize("ADMIN"), authorizePermission("shop.manage"), (req, res, next) => {
  createShopItemController(req, res).catch(next);
});

adminRouter.patch(
  "/shop/items/:id",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("shop.manage"),
  (req, res, next) => {
  updateShopItemController(req, res).catch(next);
  },
);

adminRouter.delete(
  "/shop/items/:id",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("shop.manage"),
  (req, res, next) => {
  deleteShopItemController(req, res).catch(next);
  },
);

// ─── Gift Code management ──────────────────────────────────────────────────────

adminRouter.post(
  "/gift-codes",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("giftcode.manage"),
  (req, res, next) => {
  createGiftCodeController(req, res).catch(next);
  },
);

adminRouter.get(
  "/gift-codes/items",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("giftcode.manage"),
  (req, res, next) => {
  getGiftCodeItemsController(req, res).catch(next);
  },
);

adminRouter.get("/gift-codes", authenticate, authorize("ADMIN"), authorizePermission("giftcode.manage"), (req, res, next) => {
  listGiftCodeBatchesController(req, res).catch(next);
});

adminRouter.get(
  "/gift-codes/:id/codes",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("giftcode.manage"),
  (req, res, next) => {
  getGiftCodeBatchCodesController(req, res).catch(next);
  },
);

adminRouter.patch(
  "/gift-codes/:id",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("giftcode.manage"),
  (req, res, next) => {
  updateGiftCodeBatchController(req, res).catch(next);
  },
);

adminRouter.delete(
  "/gift-codes/:id",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("giftcode.manage"),
  (req, res, next) => {
  deleteGiftCodeBatchController(req, res).catch(next);
  },
);

// ─── Admin settings (chỉ superadmin) ───────────────────────────────────────────

adminRouter.get("/settings", authenticate, authorize("ADMIN"), authorizePermission("settings.manage"), (req, res, next) => {
  listAdminSettingsController(req, res).catch(next);
});

adminRouter.get(
  "/admins",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("admins.manage"),
  (req, res, next) => {
    listAdminAccountsController(req, res).catch(next);
  },
);

adminRouter.post(
  "/admins",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("admins.manage"),
  (req, res, next) => {
    createAdminAccountController(req, res).catch(next);
  },
);

adminRouter.patch(
  "/admins/:userId",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("admins.manage"),
  (req, res, next) => {
    updateAdminAccountController(req, res).catch(next);
  },
);

adminRouter.delete(
  "/admins/:userId",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("admins.manage"),
  (req, res, next) => {
    deleteAdminAccountController(req, res).catch(next);
  },
);

adminRouter.patch(
  "/settings/role-permissions/:role",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("settings.manage"),
  (req, res, next) => {
    updateRolePermissionController(req, res).catch(next);
  },
);

adminRouter.patch(
  "/settings/payment-methods/:code",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("payments.manage"),
  (req, res, next) => {
    updatePaymentMethodConfigController(req, res).catch(next);
  },
);

adminRouter.post(
  "/settings/game-servers",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("settings.manage"),
  (req, res, next) => {
    createGameServerController(req, res).catch(next);
  },
);

adminRouter.delete(
  "/settings/game-servers/:id",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("settings.manage"),
  (req, res, next) => {
    deleteGameServerController(req, res).catch(next);
  },
);

adminRouter.use(adminSupportRouter);

export { adminRouter };
