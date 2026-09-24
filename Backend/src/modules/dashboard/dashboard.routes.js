import { Router } from "express";
import { dashboardController } from "./dashboard.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { getDashboardQuerySchema } from "./dashboard.validation.js";

const router = Router();

// Authentication required for dashboard metrics
router.use(authenticate);

// Primary Dashboard Endpoint
router.get(
  "/",
  validate(getDashboardQuerySchema, "query"),
  dashboardController.getDashboard,
);

export default router;
