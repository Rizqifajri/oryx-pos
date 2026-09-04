import { authenticate } from "@/middlewares/auth.middleware";
import { asyncHandler } from "@/middlewares/async.middleware";
import { requireAuth } from "@/middlewares/require-auth.middleware";
import { requirePermission } from "@/middlewares/require-permission.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { Router } from "express";
import * as transactionController from "./transaction.controller";
import { createTransactionSchema } from "./transaction.schema";

const router = Router();

router.use(authenticate);
router.use(requireAuth);

router.get(
  "/",
  requirePermission("transaction:list"),
  asyncHandler(transactionController.listTransactions),
);
router.get(
  "/order/:orderId",
  requirePermission("transaction:view"),
  asyncHandler(transactionController.getTransactionByOrder),
);
router.get(
  "/:id",
  requirePermission("transaction:view"),
  asyncHandler(transactionController.getTransaction),
);
router.post(
  "/",
  requirePermission("transaction:manage", "transaction:create"),
  validate(createTransactionSchema),
  asyncHandler(transactionController.createTransaction),
);
router.delete(
  "/:id",
  requirePermission("transaction:manage", "transaction:delete"),
  asyncHandler(transactionController.deleteTransaction),
);

export default router;
