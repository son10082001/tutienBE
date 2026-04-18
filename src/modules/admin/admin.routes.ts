import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";

const adminRouter = Router();

adminRouter.get("/dashboard", authenticate, authorize("ADMIN"), (req, res) => {
  return res.status(200).json({
    message: "Welcome admin dashboard",
    user: req.user,
  });
});

export { adminRouter };
