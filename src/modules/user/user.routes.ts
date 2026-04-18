import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";

const userRouter = Router();

userRouter.get("/profile", authenticate, authorize("USER", "ADMIN"), (req, res) => {
  return res.status(200).json({
    message: "User profile data",
    user: req.user,
  });
});

export { userRouter };
