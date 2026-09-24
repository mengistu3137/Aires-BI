import { Router } from "express";
import { z } from "zod";
import * as assignmentController from "./assignment.controller.js";
import { authenticate, restrictTo } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createAssignmentSchema,
  updateAssignmentStatusSchema,
  updateAssignmentSchema,
  assignmentQuerySchema,
} from "./assignment.validation.js";

const router = Router();

router.use(authenticate);

router.get("/mine", assignmentController.getMine);

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
