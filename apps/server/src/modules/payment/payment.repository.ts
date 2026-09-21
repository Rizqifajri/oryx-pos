import { db, type DbOrTx } from "@dio-sys-be/db";
import { paymentRequests } from "@dio-sys-be/db/schema";
import { eq } from "drizzle-orm";

export const createPaymentRequest = async (
  data: {
    tenantId: string;
    orderId: string;
    snapToken: string;
    snapRedirectUrl: string;
    midtransOrderId: string;
    amount: number;
    expiresAt: Date;
  },
  tx: DbOrTx = db,
) => {
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

  return paymentRequest;
};

export const findPaymentRequestById = async (id: string) => {
  const [paymentRequest] = await db
    .select()
    .from(paymentRequests)
    .where(eq(paymentRequests.id, id))
    .limit(1);

  return paymentRequest;
};

export const findPaymentRequestByOrderId = async (orderId: string) => {
  const [paymentRequest] = await db
    .select()
    .from(paymentRequests)
    .where(eq(paymentRequests.orderId, orderId))
    .orderBy(paymentRequests.createdAt)
    .limit(1);

  return paymentRequest;
};

export const findPaymentRequestByMidtransOrderId = async (
  midtransOrderId: string,
) => {
  const [paymentRequest] = await db
    .select()
    .from(paymentRequests)
    .where(eq(paymentRequests.midtransOrderId, midtransOrderId))
    .limit(1);

  return paymentRequest;
};

export const updatePaymentRequestStatus = async (
  id: string,
  data: {
    status: "pending" | "success" | "failed" | "expired";
    paymentType?: string;
    fraudStatus?: string;
  },
  tx: DbOrTx = db,
) => {
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
};

export const findPaymentRequestsByTenantId = async (tenantId: string) => {
  return db
    .select()
    .from(paymentRequests)
    .where(eq(paymentRequests.tenantId, tenantId))
    .orderBy(paymentRequests.createdAt);
};
