import { asyncHandler } from "@/middlewares/async.middleware";
import { authenticate } from "@/middlewares/auth.middleware";
import { requireAuth } from "@/middlewares/require-auth.middleware";
import { requirePermission } from "@/middlewares/require-permission.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { Router } from "express";
import * as userController from "./user.controller";
import { createUserSchema, updateUserSchema } from "./user.schema";

const router = Router();

router.use(authenticate);
router.use(requireAuth);

router.get(
  "/",
  requirePermission("user:list"),
  asyncHandler(userController.listUsers),
);
router.get(
  "/tenant/:tenantId",
  requirePermission("user:list"),
  asyncHandler(userController.getUsersByTenant),
);
router.get(
  "/:id",
  requirePermission("user:view"),
  asyncHandler(userController.getUser),
);
router.post(
  "/",
  requirePermission("user:manage", "user:create"),
  validate(createUserSchema),
  asyncHandler(userController.createUser),
);
router.patch(
  "/:id",
  requirePermission("user:manage", "user:update"),
  validate(updateUserSchema),
  asyncHandler(userController.updateUser),
);
router.delete(
  "/:id",
  requirePermission("user:manage", "user:delete"),
  asyncHandler(userController.deleteUser),
);

export default router;
