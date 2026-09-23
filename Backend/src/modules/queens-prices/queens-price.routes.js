import { Router } from "express";
import { queensPriceController } from "./queens-price.controller.js";
import { authenticate, restrictTo } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  queensPriceIdParamSchema,
  productIdParamSchema,
  createQueensPriceSchema,
  updateQueensPriceSchema,
  listQueensPricesQuerySchema,
  atDateQuerySchema,
} from "./queens-price.validation.js";

const router = Router();

// Authentication required for all endpoints
router.use(authenticate);

// ========================================================
// 1. PRODUCT-NESTED BENCHMARK ROUTES (Available to Auditors, Managers, Admins)
// ========================================================

// Current active benchmark
router.get(
  "/products/:productId/queens-prices/current",
  validate(productIdParamSchema, "params"),
  queensPriceController.getCurrentQueensPrice,
);

// Benchmark effective at specific date
router.get(
  "/products/:productId/queens-prices/at",
  validate(productIdParamSchema, "params"),
  validate(atDateQuerySchema, "query"),
  queensPriceController.getQueensPriceAtDate,
);

// Full timeline history for a specific product
router.get(
  "/products/:productId/queens-prices",
  validate(productIdParamSchema, "params"),
  validate(listQueensPricesQuerySchema, "query"),
  queensPriceController.getProductQueensPriceHistory,
);

// ========================================================
// 2. GLOBAL BENCHMARK ROUTES
// ========================================================

// List benchmarks across products
router.get(
  "/queens-prices",
  validate(listQueensPricesQuerySchema, "query"),
  queensPriceController.listQueensPrices,
);

// Single benchmark by ID
router.get(
  "/queens-prices/:id",
  validate(queensPriceIdParamSchema, "params"),
  queensPriceController.getQueensPriceById,
);

// ========================================================
// 3. MUTATION OPERATIONS (ADMIN & MANAGER ONLY)
// ========================================================

router.post(
  "/queens-prices",
  restrictTo("ADMIN", "MANAGER"),
  validate(createQueensPriceSchema, "body"),
  queensPriceController.createQueensPrice,
);

router.patch(
  "/queens-prices/:id",
  restrictTo("ADMIN", "MANAGER"),
  validate(queensPriceIdParamSchema, "params"),
  validate(updateQueensPriceSchema, "body"),
  queensPriceController.updateQueensPrice,
);

// Delete scheduled benchmark (ADMIN only)
router.delete(
  "/queens-prices/:id",
  restrictTo("ADMIN"),
  validate(queensPriceIdParamSchema, "params"),
  queensPriceController.deleteQueensPrice,
);

export default router;
