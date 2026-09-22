import { Router } from "express";
import { alertController } from "./alert.controller.js";
import { authenticate, restrictTo } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  alertIdParamSchema,
  resolveAlertSchema,
  generateAlertsForSurveyPeriodSchema,
  generateAlertForAnalysisSchema,
  listAlertsQuerySchema,
} from "./alert.validation.js";

const router = Router();

// Authentication required on all alert routes
router.use(authenticate);

// ========================================================
// 1. QUERY & RETRIEVAL (Admins, Managers, Field Auditors where permitted)
// ========================================================

// Convenience route for unresolved/active alerts
router.get(
  "/active",
  validate(listAlertsQuerySchema, "query"),
  alertController.getActiveAlerts,
);

// List alerts with filtering and pagination
router.get(
  "/",
  validate(listAlertsQuerySchema, "query"),
  alertController.listAlerts,
);

// Single alert by ID
router.get(
  "/:id",
  validate(alertIdParamSchema, "params"),
  alertController.getAlertById,
);

// ========================================================
// 2. RESOLUTION & MANAGEMENT (ADMIN & MANAGER ONLY)
// ========================================================

// Resolve an alert
router.post(
  "/:id/resolve",
  restrictTo("ADMIN", "MANAGER"),
  validate(alertIdParamSchema, "params"),
  validate(resolveAlertSchema, "body"),
  alertController.resolveAlert,
);

// Trigger batch alert generation for a survey period
router.post(
  "/generate/survey-period",
  restrictTo("ADMIN", "MANAGER"),
  validate(generateAlertsForSurveyPeriodSchema, "body"),
  alertController.generateAlertsForSurveyPeriod,
);

// Trigger alert evaluation for a single PriceAnalysis
router.post(
  "/generate/analysis",
  restrictTo("ADMIN", "MANAGER"),
  validate(generateAlertForAnalysisSchema, "body"),
  alertController.generateAlertForAnalysis,
);

export default router;
