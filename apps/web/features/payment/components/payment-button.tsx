'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreatePayment } from '../hooks/use-create-payment';

interface PaymentButtonProps {
  orderId: string;
  amount: number;
  disabled?: boolean;
}

// Extend window type for Snap
declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options: {
          onSuccess?: (result: any) => void;
          onPending?: (result: any) => void;
          onError?: (result: any) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

export function PaymentButton({ orderId, amount, disabled }: PaymentButtonProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const createPayment = useCreatePayment();

  const handlePayment = async () => {
    if (!window.snap) {
      alert('Payment system is loading. Please try again in a moment.');
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment request
      const payment = await createPayment.mutateAsync({ orderId });

      // Open Snap payment popup
      window.snap.pay(payment.snapToken, {
        onSuccess: (result) => {
          console.log('Payment success:', result);
          router.push(`/payment/finish?order_id=${orderId}`);
        },
        onPending: (result) => {
          console.log('Payment pending:', result);
          router.push(`/payment/pending?order_id=${orderId}`);
        },
        onError: (result) => {
          console.error('Payment error:', result);
          router.push(`/payment/error?order_id=${orderId}`);
        },
        onClose: () => {
          console.log('Payment popup closed');
          setIsProcessing(false);
        },
      });
    } catch (error) {
      console.error('Failed to create payment:', error);
      alert('Failed to initiate payment. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={disabled || isProcessing}
      className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isProcessing ? 'Processing...' : `Pay Online - Rp ${(amount / 100).toLocaleString()}`}
    </button>
  );
}
