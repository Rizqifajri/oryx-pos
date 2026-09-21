import { useMutation } from '@tanstack/react-query';
import { paymentApi } from '@/lib/payment-api';
import type { CreatePaymentRequest } from '../types/payment';

export function useCreatePayment() {
  return useMutation({
    mutationFn: (data: CreatePaymentRequest) => paymentApi.createPayment(data),
    onError: (error: any) => {
      console.error('Payment creation failed:', error);
    },
  });
}
