import { Router } from "express";
import * as authController from "./auth.controller.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { loginSchema } from "./auth.validation.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

// POST /login
router.post("/login", validate(loginSchema), authController.login);

// POST /logout
router.post("/logout", authenticate, authController.logout);

// GET /me
router.get("/me", authenticate, authController.getMe);

export default router;