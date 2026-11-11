import { Router } from "express";
import { periodController } from "./period.controller.js";
import { authenticate, restrictTo } from "../../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/active", periodController.getActive);
router.get("/:id", periodController.getById);
router.get("/", periodController.getAll);

router.post("/", restrictTo("ADMIN", "MANAGER"), periodController.create);
// This resolves the 404 when updating or healing a cycle:
router.put("/:id", restrictTo("ADMIN", "MANAGER"), periodController.update);
router.patch("/:id", restrictTo("ADMIN", "MANAGER"), periodController.updateStatus);
router.delete("/:id", restrictTo("ADMIN", "MANAGER"), periodController.remove);

export default router;