import { Router } from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import {
  createNewsPostController,
  deleteNewsPostController,
  getNewsBySlugController,
  listAdminNewsController,
  listFeaturedNewsController,
  listPublicNewsController,
  updateNewsPostController,
  uploadNewsImageController,
} from "./news.controller.js";

const newsRouter = Router();

newsRouter.get("/", (req, res, next) => {
  listPublicNewsController(req, res).catch(next);
});

newsRouter.get("/featured", (req, res, next) => {
  listFeaturedNewsController(req, res).catch(next);
});

newsRouter.get("/:slug", (req, res, next) => {
  getNewsBySlugController(req, res).catch(next);
});

const adminNewsRouter = Router();
const newsUploadDir = path.join(process.cwd(), "uploads", "news");
const newsUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(newsUploadDir, { recursive: true });
      cb(null, newsUploadDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".png";
      cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
    },
  }),
});

adminNewsRouter.use(authenticate, authorize("ADMIN"));
adminNewsRouter.post("/upload-image", newsUpload.single("image"), (req, res, next) => {
  uploadNewsImageController(req, res).catch(next);
});
adminNewsRouter.get("/", (req, res, next) => {
  listAdminNewsController(req, res).catch(next);
});
adminNewsRouter.post("/", (req, res, next) => {
  createNewsPostController(req, res).catch(next);
});
adminNewsRouter.patch("/:id", (req, res, next) => {
  updateNewsPostController(req, res).catch(next);
});
adminNewsRouter.delete("/:id", (req, res, next) => {
  deleteNewsPostController(req, res).catch(next);
});

export { adminNewsRouter, newsRouter };
