import { authenticate } from "@/middlewares/auth.middleware";
import { asyncHandler } from "@/middlewares/async.middleware";
import { requireAuth } from "@/middlewares/require-auth.middleware";
import { requirePermission } from "@/middlewares/require-permission.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { Router } from "express";
import * as orderController from "./order.controller";
import {
  createOrderSchema,
  publicCreateOrderSchema,
  updateOrderStatusSchema,
} from "./order.schema";

const router = Router();

// Public routes (no authentication required)
router.get(
  "/public/menu",
  asyncHandler(orderController.getPublicMenu),
);
router.post(
  "/public",
  validate(publicCreateOrderSchema),
  asyncHandler(orderController.createPublicOrder),
);

// Protected routes (authentication + permissions required)
router.use(authenticate);
router.use(requireAuth);

router.get(
  "/",
  requirePermission("order:list"),
  asyncHandler(orderController.listOrders),
);
router.get(
  "/:id",
  requirePermission("order:view"),
  asyncHandler(orderController.getOrder),
);
router.post(
  "/",
  requirePermission("order:manage", "order:create"),
  validate(createOrderSchema),
  asyncHandler(orderController.createOrder),
);
router.patch(
  "/:id/status",
  requirePermission("order:manage", "order:update"),
  validate(updateOrderStatusSchema),
  asyncHandler(orderController.updateOrderStatus),
);
router.delete(
  "/:id",
  requirePermission("order:manage", "order:delete"),
  asyncHandler(orderController.deleteOrder),
);

export default router;
