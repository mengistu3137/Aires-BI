import { Router } from "express";
import * as assignmentController from "./assignment.controller.js";
import { authenticate, restrictTo } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
    createAssignmentSchema,
    updateAssignmentStatusSchema,
    assignmentQuerySchema,
} from "./assignment.validation.js";

const router = Router();

router.use(authenticate);

// GET /mine (Auditor gets their assigned stores and 20 items)
router.get("/mine", assignmentController.getMine);

// GET / (Admin/Manager filterable overview)
router.get(
    "/",
    restrictTo("ADMIN", "MANAGER"),
    validate(assignmentQuerySchema, "query"),
    assignmentController.getAll
);

// POST / (Admin/Manager dispatches new assignment)
router.post(
    "/",
    restrictTo("ADMIN", "MANAGER"),
    validate(createAssignmentSchema),
    assignmentController.create
);

// GET /:id
router.get("/:id", assignmentController.getById);

// PATCH /:id (Update status)
router.patch(
    "/:id",
    validate(updateAssignmentStatusSchema),
    assignmentController.update
);

export default router;