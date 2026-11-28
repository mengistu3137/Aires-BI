import { Router } from "express";
import * as authController from "./auth.controller.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { loginSchema, updatePasswordSchema } from "./auth.validation.js";
import { authenticate, restrictTo } from "../../middlewares/auth.middleware.js";

const router = Router();

// POST /login
router.post("/login", validate(loginSchema), authController.login);

// POST /logout
router.post("/logout", authenticate, authController.logout);

// GET /me
router.get("/me", authenticate, authController.getMe);

// POST /change-password — required on the first sign-in with an issued password
router.post(
  "/change-password",
  authenticate,
  validate(updatePasswordSchema),
  authController.changePassword,
);

router.get(
  "/login-audit",
  authenticate,
  restrictTo("SUPER_ADMIN"),
  authController.listLoginAudit,
);

// POST /impersonate/:userId (Super Admin only)
router.post(
    "/impersonate/:userId",
    authenticate,
    restrictTo("SUPER_ADMIN", "ADMIN"), // ← Allows both Aires Super Admin and Operations Admin
    authController.impersonate
);

export default router;