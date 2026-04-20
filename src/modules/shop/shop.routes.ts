import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import {
  buyShopItemController,
  getShopMetaController,
  listShopItemsUserController,
} from "./shop.controller.js";

const shopRouter = Router();

shopRouter.get("/items", authenticate, (req, res, next) => {
  listShopItemsUserController(req, res).catch(next);
});

shopRouter.get("/meta", authenticate, (req, res, next) => {
  getShopMetaController(req, res).catch(next);
});

shopRouter.post("/buy", authenticate, (req, res, next) => {
  buyShopItemController(req, res).catch(next);
});

export { shopRouter };
