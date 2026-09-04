import { asyncHandler } from "@/middlewares/async.middleware";
import { authenticate } from "@/middlewares/auth.middleware";
import { requireAuth } from "@/middlewares/require-auth.middleware";
import { requirePermission } from "@/middlewares/require-permission.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { Router } from "express";
import * as roleController from "./role.controller";
import { createRoleSchema, updateRoleSchema } from "./role.schema";

const router = Router();

router.use(authenticate);
router.use(requireAuth);

router.get(
  "/",
  requirePermission("role:list"),
  asyncHandler(roleController.listRoles),
);
router.get(
  "/tenant/:tenantId",
  requirePermission("role:list"),
  asyncHandler(roleController.getRolesByTenant),
);
router.get(
  "/:id",
  requirePermission("role:view"),
  asyncHandler(roleController.getRole),
);
router.post(
  "/",
  requirePermission("role:manage", "role:create"),
  validate(createRoleSchema),
  asyncHandler(roleController.createRole),
);
router.patch(
  "/:id",
  requirePermission("role:manage", "role:update"),
  validate(updateRoleSchema),
  asyncHandler(roleController.updateRole),
);
router.delete(
  "/:id",
  requirePermission("role:manage", "role:delete"),
  asyncHandler(roleController.deleteRole),
);

export default router;
