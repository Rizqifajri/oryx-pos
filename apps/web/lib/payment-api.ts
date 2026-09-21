import { api } from './api';
import type {
  CreatePaymentRequest,
  CreatePaymentResponse,
  Payment,
} from '@/features/payment/types/payment';

export const paymentApi = {
  // Create payment request (PUBLIC - no auth required)
  createPayment: async (data: CreatePaymentRequest) => {
    return api.post<CreatePaymentResponse>('/payments/public/create', data);
  },

  // Get payment by ID
  getPayment: async (paymentId: string) => {
    return api.get<Payment>(`/payments/${paymentId}`);
  },

  // Get payment by order ID
  getPaymentByOrder: async (orderId: string) => {
    return api.get<Payment>(`/payments/order/${orderId}`);
  },

  // List payments (for dashboard)
  listPayments: async (params?: { status?: string; limit?: number }) => {
    return api.get<Payment[]>('/payments', { params });
  },
};
