import { Router } from "express";
import * as periodController from "./period.controller.js";
import { authenticate, restrictTo } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { createPeriodSchema, updatePeriodStatusSchema } from "./period.validation.js";

const router = Router();

router.use(authenticate);

router.get("/active", periodController.getActive);

router
    .route("/")
    .get(periodController.getAll)
    .post(restrictTo("ADMIN", "MANAGER"), validate(createPeriodSchema), periodController.create);

router
    .route("/:id")
    .get(periodController.getById)
    .patch(
        restrictTo("ADMIN", "MANAGER"),
        validate(updatePeriodStatusSchema),
        periodController.updateStatus
    );

export default router;