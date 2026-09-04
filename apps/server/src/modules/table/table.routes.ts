import { authenticate } from "@/middlewares/auth.middleware";
import { asyncHandler } from "@/middlewares/async.middleware";
import { requireAuth } from "@/middlewares/require-auth.middleware";
import { requirePermission } from "@/middlewares/require-permission.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { Router } from "express";
import * as tableController from "./table.controller";
import {
  createTableSchema,
  updateTableSchema,
  updateTableStatusSchema,
} from "./table.schema";

const router = Router();

router.use(authenticate);
router.use(requireAuth);

router.get(
  "/",
  requirePermission("table:list"),
  asyncHandler(tableController.listTables),
);
router.get(
  "/tenant/:tenantId",
  requirePermission("table:list"),
  asyncHandler(tableController.getTablesByTenant),
);
router.get(
  "/:id",
  requirePermission("table:view"),
  asyncHandler(tableController.getTable),
);
router.post(
  "/",
  requirePermission("table:manage", "table:create"),
  validate(createTableSchema),
  asyncHandler(tableController.createTable),
);
router.patch(
  "/:id/status",
  requirePermission("table:manage", "table:update"),
  validate(updateTableStatusSchema),
  asyncHandler(tableController.updateTableStatus),
);
router.patch(
  "/:id",
  requirePermission("table:manage", "table:update"),
  validate(updateTableSchema),
  asyncHandler(tableController.updateTable),
);
router.delete(
  "/:id",
  requirePermission("table:manage", "table:delete"),
  asyncHandler(tableController.deleteTable),
);

export default router;
