"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, Receipt, Loader2, Minus, Plus, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/features/cart/context/cart-context"
import { useCreatePublicOrder } from "@/features/customer/hooks/use-public-order"
import { usePaymentCalculation } from "@/features/cart/hooks/use-payment-calculation"
import { useCreatePayment } from "@/features/payment/hooks/use-create-payment"

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

export default function CustomerCheckoutPage() {
  const { tableId } = useParams() as { tableId: string }
  const router = useRouter()

  const { items, total, clear, updateQuantity } = useCart()
  const { mutateAsync: createOrder } = useCreatePublicOrder()
  const createPayment = useCreatePayment()

  const [isProcessing, setIsProcessing] = useState(false)
  const [customerName, setCustomerName] = useState("")

  const { tax, service, totalPayment } = usePaymentCalculation(total)

  function formatPrice(cents: number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  async function handlePlaceOrder() {
    if (items.length === 0) return
    if (!customerName.trim()) {
      alert("Customer name is required!")
      return
    }

    if (!window.snap) {
      alert('Payment system is loading. Please try again.')
      return
    }

    setIsProcessing(true)

    try {
      // Step 1: Create order
      const response = await createOrder({
        tableId,
        items: items.map((i) => ({ menuId: i.menuId, quantity: i.quantity })),
        customerName: customerName.trim(),
      })
      
      const orderId = response?.id || ""
      
      if (!orderId) {
        throw new Error("Order ID not found")
      }

      // Step 2: Create payment
      const payment = await createPayment.mutateAsync({ orderId })

      // Step 3: Clear cart
      clear()

      // Step 4: Open Midtrans payment
      window.snap.pay(payment.snapToken, {
        onSuccess: (result) => {
          console.log('Payment success:', result)
          router.push(`/payment/finish?order_id=${orderId}`)
        },
        onPending: (result) => {
          console.log('Payment pending:', result)
          router.push(`/payment/pending?order_id=${orderId}`)
        },
        onError: (result) => {
          console.error('Payment error:', result)
          router.push(`/payment/error?order_id=${orderId}`)
        },
        onClose: () => {
          console.log('Payment popup closed')
          // User closed the popup without completing payment
          // Stay on cart page
          setIsProcessing(false)
        },
      })
    } catch (error) {
      console.error(error)
      alert("Failed to process order. Please try again.")
      setIsProcessing(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center max-w-md mx-auto p-4 border-x">
        <p className="text-neutral-500 mb-4">Keranjang Anda kosong</p>
        <Button onClick={() => router.push(`/${tableId}/menu`)} className="rounded-full bg-neutral-900">Kembali ke Menu</Button>
      </div>
    )
  }

  // --- CONFIRM ORDER ---
  return (
    <div className="mx-auto max-w-md min-h-screen bg-neutral-50 flex flex-col relative border-x border-neutral-200 shadow-lg">

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-100 p-4 flex items-center gap-3 shadow-sm">
        <button
          onClick={() => router.back()}
          className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors text-neutral-600"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="font-bold text-sm text-neutral-800">Confirm Order</h1>
          <p className="text-[10px] text-muted-foreground">Online payment automatic</p>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4 pb-28 overflow-y-auto">

        {/* BILL SUMMARY */}
        <div className="bg-white rounded-xl p-4 border border-neutral-100 shadow-sm space-y-3">
          <h2 className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5 text-neutral-500" /> Ringkasan Tagihan
          </h2>

          <div className="space-y-3 text-xs divide-y divide-neutral-50">
            {items.map((item) => (
              <div key={item.menuId} className="flex flex-col pt-2 first:pt-0">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-neutral-800 font-medium">{item.name}</span>
                  <span className="font-semibold text-neutral-900">{formatPrice(item.price * item.quantity)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 text-[10px]">{formatPrice(item.price)} / pcs</span>
                  <div className="flex items-center gap-2 rounded-full border border-neutral-200 p-0.5">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.menuId, item.quantity - 1)}
                      className="h-4 w-4 flex items-center justify-center text-neutral-500 hover:bg-neutral-100 rounded-full"
                    >
                      <Minus className="h-2 w-2" />
                    </button>
                    <span className="text-[10px] font-bold w-3 text-center">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.menuId, item.quantity + 1)}
                      className="h-4 w-4 flex items-center justify-center text-neutral-500 hover:bg-neutral-100 rounded-full"
                    >
                      <Plus className="h-2 w-2" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-3">
              <div className="flex justify-between pt-2 text-neutral-500 text-[11px]">
                <span>Subtotal</span>
                <span>{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between pt-2 text-neutral-500 text-[11px]">
                <span>Pajak Restoran (10%)</span>
                <span>{formatPrice(tax)}</span>
              </div>
              <div className="flex justify-between pt-2 text-neutral-500 text-[11px]">
                <span>Service Charge (5%)</span>
                <span>{formatPrice(service)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ORDERER DATA */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider pl-1">Data Pemesan</h2>
          <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-3">
            <label htmlFor="customerName" className="block text-xs font-medium text-neutral-700 mb-1.5">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              id="customerName"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Contoh: Budi"
              className="w-full text-sm border-neutral-200 rounded-lg p-2.5 bg-neutral-50 border focus:ring-2 focus:ring-neutral-900 focus:outline-none"
              required
            />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
          <CreditCard className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-[11px] text-blue-700 leading-relaxed">
            Payment page will open automatically after you confirm your order. Choose payment method: QRIS, GoPay, ShopeePay, Bank Transfer, or Credit Card.
          </p>
        </div>

      </main>

      {/* STICKY BOTTOM ACTION BAR */}
      <div className="absolute bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200 p-4 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Estimated Total</span>
          <span className="font-extrabold text-base text-neutral-900">{formatPrice(totalPayment)}</span>
        </div>

        <Button
          size="default"
          className="rounded-full font-bold px-8 text-xs bg-neutral-900 text-white hover:bg-neutral-800 flex items-center gap-2 h-10 min-w-[140px]"
          onClick={handlePlaceOrder}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Processing...
            </>
          ) : (
            "Order & Pay"
          )}
        </Button>
      </div>

    </div>
  )
}
