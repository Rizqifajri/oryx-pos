import { authenticate } from "@/middlewares/auth.middleware";
import { asyncHandler } from "@/middlewares/async.middleware";
import { requireAuth } from "@/middlewares/require-auth.middleware";
import { requirePermission } from "@/middlewares/require-permission.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { Router } from "express";
import * as menuController from "./menu.controller";
import {
  bulkUpdateAvailabilitySchema,
  createMenuSchema,
  toggleAvailabilitySchema,
  updateMenuSchema,
} from "./menu.schema";

const router = Router();

router.use(authenticate);
router.use(requireAuth);

router.get(
  "/",
  requirePermission("menu:list"),
  asyncHandler(menuController.listMenus),
);
router.get(
  "/tenant/:tenantId",
  requirePermission("menu:list"),
  asyncHandler(menuController.getMenusByTenant),
);
router.get(
  "/category/:categoryId",
  requirePermission("menu:list"),
  asyncHandler(menuController.getMenusByCategory),
);
router.get(
  "/:id",
  requirePermission("menu:view"),
  asyncHandler(menuController.getMenu),
);
router.post(
  "/",
  requirePermission("menu:manage", "menu:create"),
  validate(createMenuSchema),
  asyncHandler(menuController.createMenu),
);
router.patch(
  "/bulk/availability",
  requirePermission("menu:manage", "menu:update"),
  validate(bulkUpdateAvailabilitySchema),
  asyncHandler(menuController.bulkUpdateAvailability),
);
router.patch(
  "/:id/availability",
  requirePermission("menu:manage", "menu:update"),
  validate(toggleAvailabilitySchema),
  asyncHandler(menuController.toggleAvailability),
);
router.patch(
  "/:id",
  requirePermission("menu:manage", "menu:update"),
  validate(updateMenuSchema),
  asyncHandler(menuController.updateMenu),
);
router.delete(
  "/:id",
  requirePermission("menu:manage", "menu:delete"),
  asyncHandler(menuController.deleteMenu),
);

export default router;
