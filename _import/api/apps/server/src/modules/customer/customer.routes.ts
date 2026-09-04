import { authenticate } from "@/middlewares/auth.middleware";
import { asyncHandler } from "@/middlewares/async.middleware";
import { requireAuth } from "@/middlewares/require-auth.middleware";
import { requirePermission } from "@/middlewares/require-permission.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { Router } from "express";
import * as customerController from "./customer.controller";
import {
  createCustomerSchema,
  updateCustomerSchema,
} from "./customer.schema";

const router = Router();

router.use(authenticate);
router.use(requireAuth);

router.get(
  "/",
  requirePermission("customer:list"),
  asyncHandler(customerController.listCustomers),
);
router.get(
  "/tenant/:tenantId",
  requirePermission("customer:list"),
  asyncHandler(customerController.getCustomersByTenant),
);
router.get(
  "/:id",
  requirePermission("customer:view"),
  asyncHandler(customerController.getCustomer),
);
router.post(
  "/",
  requirePermission("customer:manage", "customer:create"),
  validate(createCustomerSchema),
  asyncHandler(customerController.createCustomer),
);
router.patch(
  "/:id",
  requirePermission("customer:manage", "customer:update"),
  validate(updateCustomerSchema),
  asyncHandler(customerController.updateCustomer),
);
router.delete(
  "/:id",
  requirePermission("customer:manage", "customer:delete"),
  asyncHandler(customerController.deleteCustomer),
);

export default router;
