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

router.use(authenticate);

router.get(
  "/active",
  validate(listAlertsQuerySchema, "query"),
  alertController.getActiveAlerts,
);
router.get(
  "/",
  validate(listAlertsQuerySchema, "query"),
  alertController.listAlerts,
);
router.get(
  "/:id",
  validate(alertIdParamSchema, "params"),
  alertController.getAlertById,
);

router.post(
  "/:id/resolve",
  restrictTo("ADMIN", "MANAGER"),
  validate(alertIdParamSchema, "params"),
  validate(resolveAlertSchema, "body"),
  alertController.resolveAlert,
);

router.post(
  "/generate/survey-period",
  restrictTo("ADMIN", "MANAGER"),
  validate(generateAlertsForSurveyPeriodSchema, "body"),
  alertController.generateAlertsForSurveyPeriod,
);

router.post(
  "/generate/analysis",
  restrictTo("ADMIN", "MANAGER"),
  validate(generateAlertForAnalysisSchema, "body"),
  alertController.generateAlertForAnalysis,
);

export default router;
