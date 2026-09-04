import { asyncHandler } from "@/middlewares/async.middleware";
import { authenticate } from "@/middlewares/auth.middleware";
import { requireAuth } from "@/middlewares/require-auth.middleware";
import { requireGlobal } from "@/middlewares/require-global.middleware";
import { requirePermission } from "@/middlewares/require-permission.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { Router } from "express";
import * as tenantController from "./tenant.controller";
import { createTenantSchema, updateTenantSchema } from "./tenant.schema";

const router = Router();

router.use(authenticate);

// List tenants - accessible by both GLOBAL and TENANT scoped users
// GLOBAL users see all tenants, TENANT users see only their own
router.get(
  "/",
  requireAuth,
  requirePermission("tenant:list"),
  asyncHandler(tenantController.listTenants),
);

// Tenant-scoped operations (accessible by tenant users)
router.get(
  "/me",
  requireAuth,
  // requirePermission("tenant:view"),
  asyncHandler(tenantController.getMyTenant),
);

// GLOBAL-only operations
router.get("/:id", requireGlobal, asyncHandler(tenantController.getTenant));

router.post(
  "/",
  requireGlobal,
  validate(createTenantSchema),
  asyncHandler(tenantController.createTenant),
);

// Tenant-scoped operations
router.patch(
  "/me",
  requireAuth,
  // requirePermission("tenant:manage", "tenant:update"),
  validate(updateTenantSchema),
  asyncHandler(tenantController.updateMyTenant),
);

// GLOBAL-only operations
router.patch(
  "/:id",
  requireGlobal,
  validate(updateTenantSchema),
  asyncHandler(tenantController.updateTenant),
);

// Tenant-scoped operations
router.delete(
  "/me",
  requireAuth,
  // requirePermission("tenant:manage", "tenant:delete"),
  asyncHandler(tenantController.deleteMyTenant),
);

// GLOBAL-only operations
router.delete(
  "/:id",
  requireGlobal,
  asyncHandler(tenantController.deleteTenant),
);

export default router;
