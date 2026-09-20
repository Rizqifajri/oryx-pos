import { asyncHandler } from "@/middlewares/async.middleware";
import { authenticate } from "@/middlewares/auth.middleware";
import { requireAuth } from "@/middlewares/require-auth.middleware";
import { requirePermission } from "@/middlewares/require-permission.middleware";
import { Router } from "express";
import * as uploadController from "./upload.controller";

const router = Router();

router.use(authenticate);
router.use(requireAuth);

// Returns a presigned PUT URL so the client uploads the image straight to R2;
// the file never passes through this server.
router.post(
  "/menu",
  requirePermission("menu:manage", "menu:create", "menu:update"),
  asyncHandler(uploadController.createMenuImageUpload),
);

export default router;
