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
  requestRecalculationSchema
} from "./price-analysis.validation.js";

const router = Router();

router.use(authenticate);

// 1. Query & Retrieval
router.get(
  "/",
  validate(listPriceAnalysesQuerySchema, "query"),
  priceAnalysisController.listPriceAnalyses,
);

router.get(
  "/export/excel",
  restrictTo("ADMIN", "MANAGER"),
  priceAnalysisController.exportPriceAnalysisExcel,
);
router.get(
  "/readiness/:surveyPeriodId",
  validate(surveyPeriodIdParamSchema, "params"),
  priceAnalysisController.getSurveyPeriodReadiness,
);
router.get(
  "/:id",
  validate(priceAnalysisIdParamSchema, "params"),
  priceAnalysisController.getPriceAnalysisById,
);

router.get(
  "/product/:productId/survey-period/:surveyPeriodId",
  validate(productIdParamSchema, "params"),
  validate(surveyPeriodIdParamSchema, "params"),
  priceAnalysisController.getProductSurveyPeriodAnalysis,
);

// 2. Calculation & Action Directives
router.post(
  "/calculate",
  restrictTo("ADMIN", "MANAGER"),
  validate(createOrUpdateAnalysisSchema, "body"),
  priceAnalysisController.calculateProductAnalysis,
);
// Queens Admin submits request -> Real-time alert dispatched to Aires Admin
router.post(
  "/request-recalculation",
  restrictTo("SUPER_ADMIN", "ADMIN", "MANAGER"),
  validate(requestRecalculationSchema, "body"),
  priceAnalysisController.requestRecalculation,
);
router.get(
  "/recalculation/pending-requests",
  restrictTo("SUPER_ADMIN", "ADMIN"),
  priceAnalysisController.getPendingRecalculationRequests,
);

router.delete(
  "/recalculation/pending-requests/:surveyPeriodId",
  restrictTo("SUPER_ADMIN", "ADMIN"),
  priceAnalysisController.dismissPendingRecalculationRequest,
);
router.post(
  "/recalculate",
  restrictTo("ADMIN", "MANAGER"),
  validate(recalculateSurveyPeriodSchema, "body"),
  priceAnalysisController.recalculateSurveyPeriodAnalysis,
);

// 1-Click Recommended Price Adjustment
router.post(
  "/apply-recommendation/:id",
  restrictTo("ADMIN", "MANAGER"),
  validate(priceAnalysisIdParamSchema, "params"),
  priceAnalysisController.applyRecommendedPrice,
);


export default router;