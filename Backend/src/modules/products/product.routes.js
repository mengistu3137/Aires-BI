import { Router } from "express";
import * as productController from "./product.controller.js";
import { authenticate, restrictTo } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createProductSchema,
  updateProductSchema,
  addQueensPriceSchema,
  productQuerySchema,
} from "./product.validation.js";

const router = Router();

router.use(authenticate);

router
  .route("/")
  .get(validate(productQuerySchema, "query"), productController.getAll)
  .post(restrictTo("ADMIN", "MANAGER"), validate(createProductSchema), productController.create);

router
  .route("/:id")
  .get(productController.getById)
  .patch(restrictTo("ADMIN", "MANAGER"), validate(updateProductSchema), productController.update)
  .delete(restrictTo("ADMIN"), productController.remove);

// Historical Queens Price addition
router.post(
  "/:id/prices",
  restrictTo("ADMIN", "MANAGER"),
  validate(addQueensPriceSchema),
  productController.addPriceRecord
);

export default router;