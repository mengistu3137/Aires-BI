import { Router } from "express";
import { auditController } from "./audit.controller.js";
import { authenticate, restrictTo } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  assignmentIdParamSchema,
  auditIdParamSchema,
  createAuditSchema,
  startAuditSchema,
  updateAuditSchema,
  completeAuditSchema,
  cancelAuditSchema,
  markReviewAuditSchema,
  listAuditsQuerySchema,
} from "./audit.validation.js";

const router = Router();

// All audit routes require authentication
router.use(authenticate);

// 1. Create audit from an assignment (Auditor, Manager, Admin)
router.post(
  "/assignments/:assignmentId",
  validate(assignmentIdParamSchema, "params"),
  validate(createAuditSchema, "body"),
  auditController.createAudit,
);

// 2. Auditor convenience: active in-flight visit
router.get("/current", auditController.getCurrentAudit);

// 3. List and history audits
router.get(
  "/",
  validate(listAuditsQuerySchema, "query"),
  auditController.listAudits,
);

router.get(
  "/history",
  validate(listAuditsQuerySchema, "query"),
  (req, res, next) => {
    // Default history endpoint to completed visits if status not specified
    if (!req.query.status) {
      req.query.status = "COMPLETED";
    }
    return auditController.listAudits(req, res, next);
  },
);

// 4. Single audit details
router.get(
  "/:auditId",
  validate(auditIdParamSchema, "params"),
  auditController.getAuditById,
);

// 5. Start audit visit (captures start GPS & moves to IN_PROGRESS)
router.post(
  "/:auditId/start",
  validate(auditIdParamSchema, "params"),
  validate(startAuditSchema, "body"),
  auditController.startAudit,
);

// 6. Update permitted audit visit fields (notes only, while IN_PROGRESS)
router.patch(
  "/:auditId",
  validate(auditIdParamSchema, "params"),
  validate(updateAuditSchema, "body"),
  auditController.updateAudit,
);

// 7. Complete audit visit (captures end GPS & marks COMPLETED)
router.post(
  "/:auditId/complete",
  validate(auditIdParamSchema, "params"),
  validate(completeAuditSchema, "body"),
  auditController.completeAudit,
);

// 8. Cancel audit visit (sets CANCELLED and appends reason)
router.post(
  "/:auditId/cancel",
  validate(auditIdParamSchema, "params"),
  validate(cancelAuditSchema, "body"),
  auditController.cancelAudit,
);

// 9. Supervisor mark for review (ADMIN or MANAGER only)
router.post(
  "/:auditId/mark-review",
  restrictTo("ADMIN", "MANAGER"),
  validate(auditIdParamSchema, "params"),
  validate(markReviewAuditSchema, "body"),
  auditController.markAuditReview,
);

export default router;
