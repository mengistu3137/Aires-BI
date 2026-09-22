import { Router } from "express";
import * as storeController from "./stores.controller.js";
import { authenticate, restrictTo } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { createStoreSchema, updateStoreSchema } from "./stores.validation.js";

const router = Router();

router.use(authenticate);

router
    .route("/")
    .get(storeController.getAll)
    .post(restrictTo("ADMIN", "MANAGER"), validate(createStoreSchema), storeController.create);

router
    .route("/:id")
    .get(storeController.getById)
    .patch(restrictTo("ADMIN", "MANAGER"), validate(updateStoreSchema), storeController.update)
    .delete(restrictTo("ADMIN"), storeController.remove);

export default router;