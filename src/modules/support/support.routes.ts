import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { authenticate, authorize, authorizePermission } from "../../middlewares/auth.middleware.js";
import {
  createSupportChannelAdminController,
  createSupportTicketController,
  deleteSupportChannelAdminController,
  getMySupportTicketsController,
  getSupportMetaController,
  listSupportChannelsAdminController,
  uploadSupportIconAdminController,
  updateSupportChannelAdminController,
} from "./support.controller.js";

const supportRouter = Router();

supportRouter.get("/meta", authenticate, (req, res, next) => {
  getSupportMetaController(req, res).catch(next);
});

supportRouter.post("/tickets", authenticate, (req, res, next) => {
  createSupportTicketController(req, res).catch(next);
});

supportRouter.get("/tickets/my", authenticate, (req, res, next) => {
  getMySupportTicketsController(req, res).catch(next);
});

const adminSupportRouter = Router();
const supportUploadDir = path.join(process.cwd(), "uploads", "support");
const supportUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(supportUploadDir, { recursive: true });
      cb(null, supportUploadDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".png";
      cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
    },
  }),
});

adminSupportRouter.get(
  "/support/channels",
  authenticate,
  authorize("ADMIN"),
  (req, res, next) => {
    listSupportChannelsAdminController(req, res).catch(next);
  },
);

adminSupportRouter.post(
  "/support/channels",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("settings.manage"),
  (req, res, next) => {
    createSupportChannelAdminController(req, res).catch(next);
  },
);

adminSupportRouter.patch(
  "/support/channels/:id",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("settings.manage"),
  (req, res, next) => {
    updateSupportChannelAdminController(req, res).catch(next);
  },
);

adminSupportRouter.delete(
  "/support/channels/:id",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("settings.manage"),
  (req, res, next) => {
    deleteSupportChannelAdminController(req, res).catch(next);
  },
);

adminSupportRouter.post(
  "/support/upload-icon",
  authenticate,
  authorize("ADMIN"),
  authorizePermission("settings.manage"),
  supportUpload.single("image"),
  (req, res, next) => {
    uploadSupportIconAdminController(req, res).catch(next);
  },
);

export { supportRouter, adminSupportRouter };
