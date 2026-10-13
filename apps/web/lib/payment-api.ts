import { api } from './api';
import type { Payment } from '@/features/payment/types/payment';

export const paymentApi = {
  // Get payment by order ID
  getPaymentByOrder: async (orderId: string) => {
    return api.get<Payment>(`/payments/order/${orderId}`);
  },

  // List payments (for dashboard)
  listPayments: async (params?: { status?: string; limit?: number }) => {
    return api.get<Payment[]>('/payments', { params });
  },
};
