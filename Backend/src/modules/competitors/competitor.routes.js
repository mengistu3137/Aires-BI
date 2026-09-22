import { Router } from "express";
import * as competitorController from "./competitor.controller.js";
import { authenticate, restrictTo } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
    createCompetitorSchema,
    updateCompetitorSchema,
} from "./competitor.validation.js";

const router = Router();

router.use(authenticate);

router
    .route("/")
    .get(competitorController.getAll)
    .post(
        restrictTo("ADMIN", "MANAGER"),
        validate(createCompetitorSchema),
        competitorController.create
    );

router
    .route("/:id")
    .get(competitorController.getById)
    .patch(
        restrictTo("ADMIN", "MANAGER"),
        validate(updateCompetitorSchema),
        competitorController.update
    )
    .delete(restrictTo("ADMIN"), competitorController.remove);

export default router;