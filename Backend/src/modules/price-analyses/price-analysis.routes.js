import { Router } from "express";
import { priceAnalysisController } from "./price-analysis.controller.js";
import { authenticate, restrictTo } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  priceAnalysisIdParamSchema,
  productIdParamSchema,
  surveyPeriodIdParamSchema,
  createOrUpdateAnalysisSchema,
  recalculateSurveyPeriodSchema,
  listPriceAnalysesQuerySchema,
} from "./price-analysis.validation.js";

const router = Router();

// Authentication required on all price analysis endpoints
router.use(authenticate);

// ========================================================
// 1. QUERY & RETRIEVAL (Admins, Managers, Field Auditors where permitted)
// ========================================================

// List price analyses with filtering and pagination
router.get(
  "/",
  validate(listPriceAnalysesQuerySchema, "query"),
  priceAnalysisController.listPriceAnalyses,
);

// Single price analysis by ID
router.get(
  "/:id",
  validate(priceAnalysisIdParamSchema, "params"),
  priceAnalysisController.getPriceAnalysisById,
);

// Product analysis within a specific survey period
router.get(
  "/product/:productId/survey-period/:surveyPeriodId",
  validate(productIdParamSchema, "params"),
  validate(surveyPeriodIdParamSchema, "params"),
  priceAnalysisController.getProductSurveyPeriodAnalysis,
);

// ========================================================
// 2. CALCULATION & RECALCULATION (ADMIN & MANAGER ONLY)
// ========================================================

// Calculate or refresh analysis for a single product in a survey period
router.post(
  "/calculate",
  restrictTo("ADMIN", "MANAGER"),
  validate(createOrUpdateAnalysisSchema, "body"),
  priceAnalysisController.calculateProductAnalysis,
);

// Batch recalculate entire survey period
router.post(
  "/recalculate",
  restrictTo("ADMIN", "MANAGER"),
  validate(recalculateSurveyPeriodSchema, "body"),
  priceAnalysisController.recalculateSurveyPeriodAnalysis,
);

export default router;
