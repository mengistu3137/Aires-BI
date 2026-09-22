import { Router } from "express";
import * as surveyController from "./survey.controller.js";
import { authenticate, restrictTo } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
    createPeriodSchema,
    createAssignmentSchema,
    updateAssignmentStatusSchema,
    submitEntrySchema,
    batchSyncSchema,
} from "./survey.validation.js";

const router = Router();

router.use(authenticate);

// Survey Period
router.get("/periods/active", surveyController.getActivePeriod);
router.post(
    "/periods",
    restrictTo("ADMIN", "MANAGER"),
    validate(createPeriodSchema),
    surveyController.createPeriod
);

// Assignments
router.get("/assignments", surveyController.getAssignments);
router.post(
    "/assignments",
    restrictTo("ADMIN", "MANAGER"),
    validate(createAssignmentSchema),
    surveyController.createAssignment
);
router.patch(
    "/assignments/:id/status",
    validate(updateAssignmentStatusSchema),
    surveyController.updateAssignmentStatus
);

// Survey Field Entry Submissions & PWA Offline Sync
router.post("/entries", validate(submitEntrySchema), surveyController.submitEntry);
router.post("/sync", validate(batchSyncSchema), surveyController.syncBatch);

export default router;