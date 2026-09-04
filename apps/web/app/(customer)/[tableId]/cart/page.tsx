"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CreditCard, Wallet, CheckCircle2, QrCode, Receipt, Loader2, Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/features/cart/context/cart-context"
import { useCreatePublicOrder } from "@/features/customer/hooks/use-public-order"
import { usePaymentCalculation } from "@/features/cart/hooks/use-payment-calculation"

const PAYMENT_METHODS = [
  { id: "qris", name: "QRIS (Gopay, OVO, Dana, LinkAja)", icon: QrCode, group: "E-Wallet" },
  { id: "gopay", name: "GoPay", icon: Wallet, group: "E-Wallet" },
  { id: "shopeepay", name: "ShopeePay", icon: Wallet, group: "E-Wallet" },
  { id: "bca", name: "BCA Virtual Account", icon: CreditCard, group: "Transfer Bank" },
  { id: "mandiri", name: "Mandiri Virtual Account", icon: CreditCard, group: "Transfer Bank" },
]

export default function CustomerPaymentPage() {
  const { tableId } = useParams() as { tableId: string }
  const router = useRouter()
  
  const { items, total, clear, updateQuantity } = useCart()
  const { mutateAsync: createOrder } = useCreatePublicOrder()

  const [selectedMethod, setSelectedMethod] = useState("qris")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [placedOrderId, setPlacedOrderId] = useState("")
  const [customerName, setCustomerName] = useState("")

  const { tax, service, totalPayment } = usePaymentCalculation(total)

  function formatPrice(cents: number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  async function handleProcessPayment() {
    if (items.length === 0) return
    if (!customerName.trim()) {
      alert("Nama pemesan wajib diisi!")
      return
    }

    setIsProcessing(true)
    
    try {
      const payload = {
        tableId,
        items: items.map(i => ({ menuId: i.menuId, quantity: i.quantity })),
        customerName: `[PAID - ${selectedMethod.toUpperCase()}] ${customerName.trim()}`
      }
      const response = await createOrder(payload)
      setPlacedOrderId(response?.id || "ORD-" + Math.floor(Math.random() * 10000))
      
      
      // Simulasi loading hit API Payment Gateway selama 1.5 detik agar UI payment terlihat
      setTimeout(() => {
        clear()
        setIsProcessing(false)
        setIsSuccess(true)
      }, 1500)
    } catch (error) {
      console.error(error)
      alert("Gagal memproses pesanan")
      setIsProcessing(false)
    }
  }

  // --- SCREEN SUCCESS VIEW ---
  if (isSuccess) {
    return (
      <div className="mx-auto max-w-md min-h-screen bg-white flex flex-col items-center justify-center p-6 border-x border-neutral-200 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-4 shadow-sm">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-neutral-950">Pembayaran Sukses!</h2>
        <p className="text-xs text-neutral-400 mt-1 max-w-xs">
          Pesanan Anda sedang diteruskan ke dapur. Silakan tunggu di meja Anda.
        </p>

        {/* Ringkasan Singkat setelah sukses */}
        <div className="w-full bg-neutral-50 rounded-xl p-4 my-6 text-left border border-neutral-100 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-neutral-400">ID Pesanan</span>
            <span className="font-mono font-medium text-neutral-700">{placedOrderId.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-neutral-400">Metode</span>
            <span className="font-medium text-neutral-700 uppercase">{selectedMethod}</span>
          </div>
          <div className="flex justify-between text-xs border-t border-dashed pt-2 mt-2">
            <span className="font-semibold text-neutral-800">Total Lunas</span>
            <span className="font-bold text-neutral-950 text-sm">{formatPrice(totalPayment)}</span>
          </div>
        </div>

        <Button 
          className="w-full rounded-full font-bold bg-neutral-900 text-white"
          onClick={() => router.push(`/${tableId}/menu`)}
        >
          Kembali ke Menu Utama
        </Button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center max-w-md mx-auto p-4 border-x">
        <p className="text-neutral-500 mb-4">Keranjang Anda kosong</p>
        <Button onClick={() => router.push(`/${tableId}/menu`)} className="rounded-full bg-neutral-900">Kembali ke Menu</Button>
      </div>
    )
  }

  // --- SCREEN UTAMA PAYMENT OPSI ---
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
          <h1 className="font-bold text-sm text-neutral-800">Pilih Pembayaran</h1>
          <p className="text-[10px] text-muted-foreground">Checkout Pesanan Anda</p>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4 pb-28 overflow-y-auto">
        
        {/* 1. RINGKASAN STRUK (Rincian Biaya) */}
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

        {/* 2. PILIHAN METODE PEMBAYARAN */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider pl-1">Metode Digital</h2>
          
          <div className="bg-white rounded-xl border border-neutral-100 shadow-sm overflow-hidden divide-y divide-neutral-100">
            {PAYMENT_METHODS.map((method) => {
              const Icon = method.icon
              const isSelected = selectedMethod === method.id

              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className="w-full p-3 flex items-center justify-between text-left transition-all hover:bg-neutral-50/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg border ${isSelected ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-neutral-50 text-neutral-500'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-medium text-neutral-800">{method.name}</span>
                  </div>
                  
                  {/* Custom Radio Button */}
                  <div className={`h-4 w-4 rounded-full border flex items-center justify-center transition-all ${
                    isSelected ? 'border-neutral-900 bg-neutral-900' : 'border-neutral-300'
                  }`}>
                    {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

      </main>

      {/* 3. STICKY BOTTOM ACTION BAR */}
      <div className="absolute bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200 p-4 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Total Bayar</span>
          <span className="font-extrabold text-base text-neutral-900">{formatPrice(totalPayment)}</span>
        </div>

        <Button
          size="default"
          className="rounded-full font-bold px-8 text-xs bg-neutral-900 text-white hover:bg-neutral-800 flex items-center gap-2 h-10 min-w-[140px]"
          onClick={handleProcessPayment}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Memproses...
            </>
          ) : (
            `Bayar via ${selectedMethod.toUpperCase()}`
          )}
        </Button>
      </div>

    </div>
  )
}
