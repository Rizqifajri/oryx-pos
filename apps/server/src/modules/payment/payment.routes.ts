import { authenticate } from "@/middlewares/auth.middleware";
import { asyncHandler } from "@/middlewares/async.middleware";
import { requireAuth } from "@/middlewares/require-auth.middleware";
import { requirePermission } from "@/middlewares/require-permission.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { Router } from "express";
import * as paymentController from "./payment.controller";
import { createPaymentSchema, midtransWebhookSchema } from "./payment.schema";

const router = Router();

// Public routes - no auth required
router.post(
  "/webhook",
  validate(midtransWebhookSchema),
  asyncHandler(paymentController.handleWebhook),
);

// Public payment creation for customers
router.post(
  "/public/create",
  validate(createPaymentSchema),
  asyncHandler(paymentController.createPublicPayment),
);

// Protected routes - require authentication
router.use(authenticate);
router.use(requireAuth);

// Create payment request for an order
router.post(
  "/create",
  requirePermission("transaction:create", "transaction:manage"),
  validate(createPaymentSchema),
  asyncHandler(paymentController.createPayment),
);

// Get payment request by ID
router.get(
  "/:id",
  requirePermission("transaction:view"),
  asyncHandler(paymentController.getPaymentRequest),
);

// Get payment request by order ID
router.get(
  "/order/:orderId",
  requirePermission("transaction:view"),
  asyncHandler(paymentController.getPaymentRequestByOrder),
);

// List payment requests
router.get(
  "/",
  requirePermission("transaction:list"),
  asyncHandler(paymentController.listPaymentRequests),
);

export default router;
