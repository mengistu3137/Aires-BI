import { Router } from "express";
import * as biController from "./bi.controller.js";
import { authenticate, restrictTo } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { biQuerySchema } from "./bi.validation.js";

const router = Router();

router.use(authenticate);

// Available to ADMIN and MANAGER
router.get(
    "/dashboard",
    restrictTo("ADMIN", "MANAGER"),
    validate(biQuerySchema, "query"),
    biController.getAnalytics
);

router.get(
    "/export",
    restrictTo("ADMIN", "MANAGER"),
    biController.getExport
);

export default router;