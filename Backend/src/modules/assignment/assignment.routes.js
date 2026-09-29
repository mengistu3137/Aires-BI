import { Router } from "express";
import { z } from "zod";
import * as assignmentController from "./assignment.controller.js";
import { authenticate, restrictTo } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createAssignmentSchema,
  createBatchAssignmentSchema,
  updateStoreAllocationsSchema,
  updateAssignmentStatusSchema,
  updateAssignmentSchema,
  assignmentQuerySchema,
} from "./assignment.validation.js";

const router = Router();

router.use(authenticate);

router.get("/mine", assignmentController.getMine);
// Cross-Auditor Store Progress Route
// Store allocations query & batch dispatch
router.get(
  "/store/:storeId/period/:surveyPeriodId/allocations",
  restrictTo("ADMIN", "MANAGER"),
  assignmentController.getStoreAllocations
);

router.post(
  "/batch",
  restrictTo("ADMIN", "MANAGER"),
  validate(createBatchAssignmentSchema),
  assignmentController.createBatch
);

router.put(
  "/store/allocations",
  restrictTo("ADMIN", "MANAGER"),
  validate(updateStoreAllocationsSchema),
  assignmentController.updateStoreAllocations
);
router.get(
  "/store/:storeId/period/:surveyPeriodId/progress",
  assignmentController.getStoreProgress
);
router.get(
  "/",
  restrictTo("ADMIN", "MANAGER"),
  validate(assignmentQuerySchema, "query"),
  assignmentController.getAll,
);

router.post(
  "/",
  restrictTo("ADMIN", "MANAGER"),
  validate(createAssignmentSchema),
  assignmentController.create,
);

router.get("/:id", assignmentController.getById);

const combinedUpdateSchema = z.union([
  updateAssignmentStatusSchema,
  updateAssignmentSchema,
]);

router.patch(
  "/:id",
  validate(combinedUpdateSchema),
  assignmentController.update,
);

router.delete(
  "/:id",
  restrictTo("ADMIN", "MANAGER"),
  assignmentController.remove,
);

export default router;
