import { Router } from "express";
import { observationController } from "./observation.controller.js";
import { authenticate, restrictTo } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  auditIdParamSchema,
  observationIdParamSchema,
  createObservationSchema,
  updateObservationSchema,
  rejectObservationSchema,
  requestReviewObservationSchema,
  listObservationsQuerySchema,
} from "./observation.validation.js";

const router = Router({ mergeParams: true });

// All observation endpoints require an authenticated user
router.use(authenticate);

// ========================================================
// 1. NESTED ROUTES UNDER AUDIT: /api/v1/audits/:auditId/observations
// ========================================================
router.post(
  "/audits/:auditId/observations",
  validate(auditIdParamSchema, "params"),
  validate(createObservationSchema, "body"),
  observationController.createObservation,
);

router.get(
  "/audits/:auditId/observations",
  validate(auditIdParamSchema, "params"),
  validate(listObservationsQuerySchema, "query"),
  observationController.listAuditObservations,
);

// ========================================================
// 2. ROOT OBSERVATION ROUTES: /api/v1/observations
// ========================================================
router.get(
  "/observations",
  validate(listObservationsQuerySchema, "query"),
  observationController.listAllObservations,
);

router.get(
  "/observations/:observationId",
  validate(observationIdParamSchema, "params"),
  observationController.getObservationById,
);

router.patch(
  "/observations/:observationId",
  validate(observationIdParamSchema, "params"),
  validate(updateObservationSchema, "body"),
  observationController.updateObservation,
);

// ========================================================
// 3. SUPERVISOR REVIEW ACTIONS (ADMIN, MANAGER)
// ========================================================
router.post(
  "/observations/:observationId/approve",
  restrictTo("ADMIN", "MANAGER"),
  validate(observationIdParamSchema, "params"),
  observationController.approveObservation,
);

router.post(
  "/observations/:observationId/reject",
  restrictTo("ADMIN", "MANAGER"),
  validate(observationIdParamSchema, "params"),
  observationController.rejectObservation,
);

router.post(
  "/observations/:observationId/request-review",
  restrictTo("ADMIN", "MANAGER"),
  validate(observationIdParamSchema, "params"),
  observationController.requestObservationReview,
);

export default router;
