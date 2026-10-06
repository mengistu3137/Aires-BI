import { Router } from "express";
import * as aiController from "./ai.controller.js";
import { authenticate, restrictTo } from "../../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);

// 1. Observation Anomaly Screening (Supervisor Review)
router.get(
    "/screen-observation/:observationId",
    restrictTo("ADMIN", "MANAGER"),
    aiController.screenObservation,
);

// 2. Executive Intelligence Brief (C-Suite Dashboard)
router.post(
    "/executive-brief",
    restrictTo("ADMIN", "MANAGER"),
    aiController.generateExecutiveBrief,
);

export default router;