import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import {
  createTicketConversionController,
  getTicketExchangeHistoryController,
  getTicketExchangeMetaController,
} from "./ticket-exchange.controller.js";

const ticketExchangeRouter = Router();

ticketExchangeRouter.get("/meta", authenticate, (req, res, next) => {
  getTicketExchangeMetaController(req, res).catch(next);
});

ticketExchangeRouter.post("/convert", authenticate, (req, res, next) => {
  createTicketConversionController(req, res).catch(next);
});

ticketExchangeRouter.get("/history", authenticate, (req, res, next) => {
  getTicketExchangeHistoryController(req, res).catch(next);
});

export { ticketExchangeRouter };
