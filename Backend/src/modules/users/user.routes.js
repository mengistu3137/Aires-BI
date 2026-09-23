import { Router } from "express";
import * as userController from "./user.controller.js";
import { authenticate, restrictTo } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { createUserSchema, updateUserSchema, userQuerySchema } from "./user.validation.js";

const router = Router();

router.use(authenticate);
router.patch("/me/location-permission", userController.updateMyLocationPermission);
router.use(restrictTo("ADMIN"));

router
  .route("/")
  .get(validate(userQuerySchema, "query"), userController.getAll)
  .post(validate(createUserSchema), userController.create);

router
  .route("/:id")
  .get(userController.getById)
  .patch(validate(updateUserSchema), userController.update)
  .delete(userController.remove);

export default router;