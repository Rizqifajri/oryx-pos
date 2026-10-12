import type { PaymentStatus } from '../types/payment';

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
}

const statusConfig: Record<PaymentStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
  },
  success: {
    label: 'Success',
    className: 'bg-green-50 text-green-700 ring-green-600/20',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-50 text-red-700 ring-red-600/20',
  },
  expired: {
    label: 'Expired',
    className: 'bg-gray-50 text-gray-600 ring-gray-500/20',
  },
};

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${config.className}`}>
      {config.label}
    </span>
  );
}
