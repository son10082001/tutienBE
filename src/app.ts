import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import path from "node:path";
import { errorHandler } from "./middlewares/error.middleware.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { depositRouter } from "./modules/deposit/deposit.routes.js";
import { adminNewsRouter, newsRouter } from "./modules/news/news.routes.js";
import { shopRouter } from "./modules/shop/shop.routes.js";
import { ticketExchangeRouter } from "./modules/ticket-exchange/ticket-exchange.routes.js";
import { userRouter } from "./modules/user/user.routes.js";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/health", (_req, res) => {
  return res.status(200).json({ message: "OK" });
});

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/user", userRouter);
app.use("/api/deposit", depositRouter);
app.use("/api/ticket-exchange", ticketExchangeRouter);
app.use("/api/shop", shopRouter);
app.use("/api/news", newsRouter);
app.use("/api/admin/news", adminNewsRouter);

app.use(errorHandler);

export { app };
