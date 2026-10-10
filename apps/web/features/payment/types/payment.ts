export type PaymentStatus = 'pending' | 'success' | 'failed' | 'expired';

export interface Payment {
  id: string;
  /** Set for a single-order payment; null when it pays a table bill. */
  orderId: string | null;
  billId?: string | null;
  tenantId: string;
  snapToken: string;
  snapRedirectUrl: string;
  midtransOrderId: string;
  amount: number;
  status: PaymentStatus;
  paymentType?: string;
  fraudStatus?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentRequest {
  orderId: string;
}

export interface CreatePaymentResponse {
  id: string;
  snapToken: string;
  snapRedirectUrl: string;
  amount: number;
  expiresAt: string;
}
