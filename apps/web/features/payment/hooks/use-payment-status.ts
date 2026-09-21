import { useQuery } from '@tanstack/react-query';
import { paymentApi } from '@/lib/payment-api';

export function usePaymentStatus(orderId: string | null) {
  return useQuery({
    queryKey: ['payment', 'order', orderId],
    queryFn: () => paymentApi.getPaymentByOrder(orderId!),
    enabled: !!orderId,
    refetchInterval: 5000, // Poll every 5 seconds
  });
}

export function usePaymentsList(status?: string) {
  return useQuery({
    queryKey: ['payments', { status }],
    queryFn: () => paymentApi.listPayments({ status }),
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}
