import { Router } from "express";
import { observationReportController } from "./report.controller.js";
import { authenticate, restrictTo } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { observationReportQuerySchema } from "./report.validation.js";

const router = Router({ mergeParams: true });

router.use(authenticate);

// ========================================================
// REPORTS: /api/v1/reports/...
// Query: surveyPeriodId (required)
//        reportType (optional): FRESH_CORNER | ULTRA_SENSITIVE (omit = both)
//        storeId (optional)
// ========================================================
router.get(
  "/summary",
  restrictTo("ADMIN", "MANAGER"),
  validate(observationReportQuerySchema, "query"),
  observationReportController.getReportSummary,
);

router.get(
  "/pdf",
  restrictTo("ADMIN", "MANAGER"),
  validate(observationReportQuerySchema, "query"),
  observationReportController.downloadPdfReport,
);

router.get(
  "/excel",
  restrictTo("ADMIN", "MANAGER"),
  validate(observationReportQuerySchema, "query"),
  observationReportController.downloadExcelReport,
);

export default router;
