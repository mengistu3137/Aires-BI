import { Router } from "express";
import * as controller from "./product.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";
import { tenantHandler } from "../../middlewares/tenant.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import { requirePermission } from "../permission/permission.middleware.js";
import {
  categoryCreateSchema,
  categoryListQuerySchema,
  categoryUpdateSchema,
  idParamSchema,
} from "./product.validation.js";

const router = Router();
router.use(protect, tenantHandler);

// Permission-Gated Category mutations
router.post(
  "/",
  requirePermission("category.create"),
  validateRequest({ body: categoryCreateSchema }),
  controller.createCategory,
);
router.get(
  "/",
  requirePermission("category.read"),
  validateRequest({ query: categoryListQuerySchema }),
  controller.getCategories,
);
router.patch(
  "/:id",
  requirePermission("category.update"),
  validateRequest({ params: idParamSchema, body: categoryUpdateSchema }),
  controller.updateCategory,
);
router.delete(
  "/:id",
  requirePermission("category.delete"),
  validateRequest({ params: idParamSchema }),
  controller.deleteCategory,
);

export default router;
