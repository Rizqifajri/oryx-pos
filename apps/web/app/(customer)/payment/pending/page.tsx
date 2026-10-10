'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePaymentStatus } from '@/features/payment/hooks/use-payment-status';
import Link from 'next/link';

function PaymentPendingContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const router = useRouter();
  const { data: payment } = usePaymentStatus(orderId);

  // Redirect if payment becomes successful
  useEffect(() => {
    if (payment?.status === 'success') {
      router.push(`/payment/finish?order_id=${orderId}`);
    }
  }, [payment, orderId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Pending Icon */}
        <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Pending</h1>
        <p className="text-gray-600 mb-6">
          Please complete your payment to confirm your order.
        </p>

        {payment && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Order ID:</span>
              <span className="font-mono text-sm">{orderId?.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Amount:</span>
              <span className="font-semibold">Rp {(payment.amount / 100).toLocaleString()}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Status:</span>
              <span className="text-yellow-600 font-semibold">{payment.status.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Expires:</span>
              <span className="text-sm">{new Date(payment.expiresAt).toLocaleString()}</span>
            </div>
          </div>
        )}

        <p className="text-sm text-gray-500 mb-6">
          If you have already paid, please wait while we verify your payment.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Status
          </button>
          <Link
            href="/"
            className="block text-gray-600 hover:text-gray-900 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPendingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <PaymentPendingContent />
    </Suspense>
  );
}
