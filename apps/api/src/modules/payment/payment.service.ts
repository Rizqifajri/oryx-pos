import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "@dio-sys-be/db";
import crypto from "crypto";
import { AppError } from "../../common/errors/app-error";
import type { UserContext } from "../../common/types/user-context";
import { assertTenantMatch } from "../../common/utils/assert-permission";
import { computePriceBreakdown } from "../../common/utils/pricing";
import { DRIZZLE } from "../../database/database.module";
import { OrderRepository } from "../order/order.repository";
import { TableRepository } from "../table/table.repository";
import { TransactionRepository } from "../transaction/transaction.repository";
import { snapClient } from "./payment.config";
import { PaymentRepository } from "./payment.repository";
import type { MidtransWebhookPayload } from "./payment.schema";

@Injectable()
export class PaymentService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly paymentRepo: PaymentRepository,
    private readonly orderRepo: OrderRepository,
    private readonly tableRepo: TableRepository,
    private readonly transactionRepo: TransactionRepository,
  ) {}

  /**
   * Create a Midtrans Snap payment token for an order (PUBLIC - no auth required).
   * Used by customers to pay for their orders.
   */
  async createPublicSnapToken(orderId: string) {
    // Get order with full details
    const order = await this.orderRepo.findOrderById(orderId);
    if (!order) throw new AppError("Order not found", 404);

    // Validate order state
    if (order.status === "CANCELED") {
      throw new AppError("Cannot create payment for canceled order", 400);
    }

    // Check if order is already paid
    if (order.status === "COMPLETED") {
      const existingTx =
        await this.transactionRepo.findTransactionByOrderId(orderId);
      if (existingTx) {
        throw new AppError("Order has already been paid", 400);
      }
    }

    // Check for existing pending payment
    const existing =
      await this.paymentRepo.findPaymentRequestByOrderId(orderId);
    if (existing && existing.status === "pending") {
      const now = new Date();
      if (now < existing.expiresAt) {
        // Return existing valid payment request
        return {
          id: existing.id,
          snapToken: existing.snapToken,
          snapRedirectUrl: existing.snapRedirectUrl,
          amount: existing.amount,
          expiresAt: existing.expiresAt,
        };
      }
    }

    // Calculate amounts with tax and service charge
    const breakdown = computePriceBreakdown(order.totalPrice);

    // Generate unique Midtrans order ID
    const midtransOrderId = `ORD-${order.id.substring(0, 8)}-${Date.now()}`;

    // Get order items for detailed display
    const orderItems = await this.orderRepo.findOrderItemsByOrderId(orderId);

    // Prepare Snap transaction parameters
    const parameter = {
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: Math.round(breakdown.totalAmount / 100), // Convert cents to rupiah
      },
      item_details: [
        ...orderItems.map((item) => ({
          id: item.menuId,
          name: item.menuName || `Menu Item ${item.menuId.substring(0, 8)}`,
          price: Math.round(item.price / 100), // Convert cents to rupiah
          quantity: item.quantity,
        })),
        {
          id: "TAX",
          name: "Pajak Restoran (10%)",
          price: Math.round(breakdown.taxAmount / 100), // Convert cents to rupiah
          quantity: 1,
        },
        {
          id: "SERVICE",
          name: "Service Charge (5%)",
          price: Math.round(breakdown.serviceAmount / 100), // Convert cents to rupiah
          quantity: 1,
        },
      ],
      customer_details: {
        first_name: order.customerName || "Customer",
        phone: order.customerPhone || "",
      },
      enabled_payments: [
        "gopay",
        "qris",
        "shopeepay",
        "other_qris",
        "bank_transfer",
        "echannel",
        "credit_card",
      ],
    };

    // Call Midtrans Snap API
    const transaction = await snapClient.createTransaction(parameter);

    // Save payment request to database
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const paymentRequest = await this.paymentRepo.createPaymentRequest({
      tenantId: order.tenantId,
      orderId: order.id,
      snapToken: transaction.token,
      snapRedirectUrl: transaction.redirect_url,
      midtransOrderId,
      amount: breakdown.totalAmount,
      status: "pending",
      expiresAt,
    });

    return {
      id: paymentRequest.id,
      snapToken: transaction.token,
      snapRedirectUrl: transaction.redirect_url,
      amount: breakdown.totalAmount,
      expiresAt,
    };
  }

  /**
   * Create a Midtrans Snap payment token for an order (AUTHENTICATED).
   * Returns the snap token and redirect URL for the customer to complete payment.
   */
  async createSnapToken(ctx: UserContext, orderId: string) {
    // Get order with full details
    const order = await this.orderRepo.findOrderById(orderId);
    if (!order) throw new AppError("Order not found", 404);

    // Validate tenant access
    if (ctx.scope === "TENANT") {
      if (!ctx.tenantId) throw new AppError("Tenant context required", 400);
      assertTenantMatch(ctx, order.tenantId);
    }

    // Validate order state
    if (order.status === "CANCELED") {
      throw new AppError("Cannot create payment for canceled order", 400);
    }

    // Check if order is already paid
    if (order.status === "COMPLETED") {
      const existingTx =
        await this.transactionRepo.findTransactionByOrderId(orderId);
      if (existingTx) {
        throw new AppError("Order has already been paid", 400);
      }
    }

    // Check for existing pending payment
    const existing =
      await this.paymentRepo.findPaymentRequestByOrderId(orderId);
    if (existing && existing.status === "pending") {
      const now = new Date();
      if (now < existing.expiresAt) {
        // Return existing valid payment request
        return {
          id: existing.id,
          snapToken: existing.snapToken,
          snapRedirectUrl: existing.snapRedirectUrl,
          amount: existing.amount,
          expiresAt: existing.expiresAt,
        };
      }
    }

    // Calculate amounts with tax and service charge
    const breakdown = computePriceBreakdown(order.totalPrice);

    // Generate unique Midtrans order ID
    const midtransOrderId = `ORD-${order.id.substring(0, 8)}-${Date.now()}`;

    // Get order items for detailed display
    const orderItems = await this.orderRepo.findOrderItemsByOrderId(orderId);

    // Prepare Snap transaction parameters
    const parameter = {
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: Math.round(breakdown.totalAmount / 100), // Convert cents to rupiah
      },
      item_details: [
        ...orderItems.map((item) => ({
          id: item.menuId,
          name: item.menuName || `Menu Item ${item.menuId.substring(0, 8)}`,
          price: Math.round(item.price / 100), // Convert cents to rupiah
          quantity: item.quantity,
        })),
        {
          id: "TAX",
          name: "Pajak Restoran (10%)",
          price: Math.round(breakdown.taxAmount / 100), // Convert cents to rupiah
          quantity: 1,
        },
        {
          id: "SERVICE",
          name: "Service Charge (5%)",
          price: Math.round(breakdown.serviceAmount / 100), // Convert cents to rupiah
          quantity: 1,
        },
      ],
      customer_details: {
        first_name: order.customerName || "Customer",
        phone: order.customerPhone || "",
      },
      enabled_payments: [
        "gopay",
        "qris",
        "shopeepay",
        "other_qris",
        "bank_transfer",
        "echannel",
        "bca_va",
        "bni_va",
        "bri_va",
        "permata_va",
        "other_va",
      ],
      callbacks: {
        finish: `${process.env.FRONTEND_URL}/payment/finish?order_id=${order.id}`,
      },
      expiry: {
        start_time: new Date().toISOString(),
        unit: "hours",
        duration: 24,
      },
    };

    // Create Snap token via Midtrans API
    const transaction = await snapClient.createTransaction(parameter);

    // Save payment request to database
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const paymentRequest = await this.paymentRepo.createPaymentRequest({
      tenantId: order.tenantId,
      orderId: order.id,
      snapToken: transaction.token,
      snapRedirectUrl: transaction.redirect_url,
      midtransOrderId,
      amount: breakdown.totalAmount,
      expiresAt,
    });

    return {
      id: paymentRequest.id,
      snapToken: paymentRequest.snapToken,
      snapRedirectUrl: paymentRequest.snapRedirectUrl,
      amount: paymentRequest.amount,
      expiresAt: paymentRequest.expiresAt,
    };
  }

  /**
   * Handle Midtrans webhook notification.
   * Updates payment status and creates transaction record on successful payment.
   */
  async handleWebhook(notificationData: MidtransWebhookPayload) {
    // Verify signature to ensure request is from Midtrans
    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const hash = crypto
      .createHash("sha512")
      .update(
        `${notificationData.order_id}${notificationData.status_code}${notificationData.gross_amount}${serverKey}`,
      )
      .digest("hex");

    if (hash !== notificationData.signature_key) {
      throw new AppError("Invalid signature", 403);
    }

    // Get payment request
    const paymentRequest =
      await this.paymentRepo.findPaymentRequestByMidtransOrderId(
        notificationData.order_id,
      );
    if (!paymentRequest) {
      throw new AppError("Payment request not found", 404);
    }

    // Get order
    const order = await this.orderRepo.findOrderById(paymentRequest.orderId);
    if (!order) throw new AppError("Order not found", 404);

    // Map Midtrans transaction status to our payment status
    const { transaction_status, fraud_status } = notificationData;
    let paymentStatus: "pending" | "success" | "failed" | "expired" = "pending";

    if (transaction_status === "capture") {
      // Credit card capture - check fraud status
      paymentStatus = fraud_status === "accept" ? "success" : "pending";
    } else if (transaction_status === "settlement") {
      // Payment successfully settled
      paymentStatus = "success";
    } else if (transaction_status === "pending") {
      // Payment pending (e.g., waiting for bank transfer)
      paymentStatus = "pending";
    } else if (["deny", "cancel", "expire"].includes(transaction_status)) {
      // Payment failed or expired
      paymentStatus = transaction_status === "expire" ? "expired" : "failed";
    }

    // Update payment request status
    await this.paymentRepo.updatePaymentRequestStatus(paymentRequest.id, {
      status: paymentStatus,
      paymentType: notificationData.payment_type,
      fraudStatus: fraud_status,
    });

    // If payment is successful, create transaction and update order
    if (paymentStatus === "success") {
      // Use transaction to ensure atomicity
      await this.db.transaction(async (tx) => {
        // Check if transaction already exists (idempotency)
        const existingTx = await this.transactionRepo.findTransactionByOrderId(
          order.id,
        );
        if (existingTx) {
          // Already processed, skip
          return;
        }

        // Update order status to COMPLETED if not already
        if (order.status !== "COMPLETED") {
          await this.orderRepo.updateOrderStatus(order.id, "COMPLETED");
        }

        // Create transaction record
        const breakdown = computePriceBreakdown(order.totalPrice);
        await this.transactionRepo.createTransaction(
          {
            tenantId: order.tenantId,
            orderId: order.id,
            subtotal: breakdown.subtotal,
            taxAmount: breakdown.taxAmount,
            serviceAmount: breakdown.serviceAmount,
            totalAmount: breakdown.totalAmount,
            paymentMethod: notificationData.payment_type,
            paymentRequestId: paymentRequest.id,
            midtransTransactionId: notificationData.transaction_id,
          },
          tx,
        );

        // Free table if order has one assigned
        if (order.tableId) {
          await this.tableRepo.updateTable(
            order.tableId,
            { status: "AVAILABLE" },
            tx,
          );
        }
      });
    }

    return {
      status: paymentStatus,
      order_id: order.id,
      midtrans_order_id: notificationData.order_id,
    };
  }

  /**
   * Get payment request by ID
   */
  async getPaymentRequest(ctx: UserContext, id: string) {
    const paymentRequest = await this.paymentRepo.findPaymentRequestById(id);
    if (!paymentRequest) throw new AppError("Payment request not found", 404);

    // Validate tenant access
    if (ctx.scope === "TENANT") {
      if (!ctx.tenantId) throw new AppError("Tenant context required", 400);
      assertTenantMatch(ctx, paymentRequest.tenantId);
    }

    return paymentRequest;
  }

  /**
   * Get payment request by order ID
   */
  async getPaymentRequestByOrder(ctx: UserContext, orderId: string) {
    const order = await this.orderRepo.findOrderById(orderId);
    if (!order) throw new AppError("Order not found", 404);

    // Validate tenant access
    if (ctx.scope === "TENANT") {
      if (!ctx.tenantId) throw new AppError("Tenant context required", 400);
      assertTenantMatch(ctx, order.tenantId);
    }

    const paymentRequest =
      await this.paymentRepo.findPaymentRequestByOrderId(orderId);
    if (!paymentRequest) {
      throw new AppError("Payment request not found for this order", 404);
    }

    return paymentRequest;
  }

  /**
   * List all payment requests (admin only)
   */
  async listPaymentRequests(
    ctx: UserContext,
    filters?: { tenantId?: string },
  ) {
    // For TENANT scope: always use their tenant
    if (ctx.scope === "TENANT") {
      if (!ctx.tenantId) throw new AppError("Tenant context required", 400);
      return await this.paymentRepo.findPaymentRequestsByTenantId(ctx.tenantId);
    }

    // For GLOBAL scope: use filter if provided
    if (filters?.tenantId) {
      return await this.paymentRepo.findPaymentRequestsByTenantId(
        filters.tenantId,
      );
    }

    // Return all (would need to implement findAllPaymentRequests for this)
    throw new AppError("Tenant filter required for listing payments", 400);
  }
}
