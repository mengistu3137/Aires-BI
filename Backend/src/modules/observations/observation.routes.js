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
import { uploadMultipleMiddleware, uploadFile } from "../../utils/upload.js";
import ApiError from "../../utils/api-error.js";

const router = Router({ mergeParams: true });

// All observation endpoints require an authenticated user
router.use(authenticate);

router.post(
  "/observations/upload-evidence",
  uploadMultipleMiddleware,
  async (req, res, next) => {
    try {
      // Gather files from either "proofs" or "proof" fields or single file
      const files = [
        ...(req.files?.proofs || []),
        ...(req.files?.proof || []),
        ...(req.file ? [req.file] : []),
      ];

      if (files.length === 0) {
        throw new ApiError(400, "Please select at least one photo proof.");
      }

      const uploadedUrls = [];
      for (const file of files) {
        const fileUrl = await uploadFile(file, { folder: "receipts" });
        uploadedUrls.push(fileUrl);
      }

      res.status(200).json({
        status: "success",
        message: `${uploadedUrls.length} image(s) uploaded successfully`,
        data: {
          urls: uploadedUrls,
          url: uploadedUrls.join(","),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ========================================================
// 2. NESTED ROUTES UNDER AUDIT: /api/v1/audits/:auditId/observations
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
// 3. ROOT OBSERVATION LIST: /api/v1/observations
// ========================================================
router.get(
  "/observations",
  validate(listObservationsQuerySchema, "query"),
  observationController.listAllObservations,
);

// ========================================================
// 4. SUPERVISOR REVIEW ACTIONS (ADMIN, MANAGER)
// (Must be defined before generic :observationId to avoid matching)
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
  validate(rejectObservationSchema),
  observationController.rejectObservation,
);

router.post(
  "/observations/:observationId/request-review",
  restrictTo("ADMIN", "MANAGER"),
  validate(observationIdParamSchema, "params"),
  observationController.requestObservationReview,
);

// ========================================================
// 5. PARAMETER WILDCARDS: /api/v1/observations/:observationId
// ========================================================
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

export default router;