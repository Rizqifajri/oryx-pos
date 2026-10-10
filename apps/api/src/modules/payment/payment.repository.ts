import { Inject, Injectable } from "@nestjs/common";
import type { Db, DbOrTx } from "@dio-sys-be/db";
import { paymentRequests } from "@dio-sys-be/db/schema";
import { eq } from "drizzle-orm";
import { DRIZZLE } from "../../database/database.module";

@Injectable()
export class PaymentRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async createPaymentRequest(
    data: {
      tenantId: string;
      orderId: string;
      snapToken: string;
      snapRedirectUrl: string;
      midtransOrderId: string;
      amount: number;
      // Accepted for call-site clarity; the insert below always records a new
      // request as "pending".
      status?: "pending" | "success" | "failed" | "expired";
      expiresAt: Date;
    },
    tx: DbOrTx = this.db,
  ) {
    const [paymentRequest] = await tx
      .insert(paymentRequests)
      .values({
        tenantId: data.tenantId,
        orderId: data.orderId,
        snapToken: data.snapToken,
        snapRedirectUrl: data.snapRedirectUrl,
        midtransOrderId: data.midtransOrderId,
        amount: data.amount,
        status: "pending",
        expiresAt: data.expiresAt,
      })
      .returning();

    if (!paymentRequest) {
      throw new Error("Failed to create payment request");
    }

    return paymentRequest;
  }

  async findPaymentRequestById(id: string) {
    const [paymentRequest] = await this.db
      .select()
      .from(paymentRequests)
      .where(eq(paymentRequests.id, id))
      .limit(1);

    return paymentRequest;
  }

  async findPaymentRequestByOrderId(orderId: string) {
    const [paymentRequest] = await this.db
      .select()
      .from(paymentRequests)
      .where(eq(paymentRequests.orderId, orderId))
      .orderBy(paymentRequests.createdAt)
      .limit(1);

    return paymentRequest;
  }

  async findPaymentRequestByMidtransOrderId(midtransOrderId: string) {
    const [paymentRequest] = await this.db
      .select()
      .from(paymentRequests)
      .where(eq(paymentRequests.midtransOrderId, midtransOrderId))
      .limit(1);

    return paymentRequest;
  }

  async updatePaymentRequestStatus(
    id: string,
    data: {
      status: "pending" | "success" | "failed" | "expired";
      paymentType?: string;
      fraudStatus?: string;
    },
    tx: DbOrTx = this.db,
  ) {
    const [updated] = await tx
      .update(paymentRequests)
      .set({
        status: data.status,
        paymentType: data.paymentType,
        fraudStatus: data.fraudStatus,
        updatedAt: new Date(),
      })
      .where(eq(paymentRequests.id, id))
      .returning();

    return updated;
  }

  async findPaymentRequestsByTenantId(tenantId: string) {
    return this.db
      .select()
      .from(paymentRequests)
      .where(eq(paymentRequests.tenantId, tenantId))
      .orderBy(paymentRequests.createdAt);
  }
}
