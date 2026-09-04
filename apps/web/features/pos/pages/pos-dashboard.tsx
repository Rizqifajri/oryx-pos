"use client"

import { useState } from "react"
import { useCart } from "@/features/cart/context/cart-context"
import { usePosMenus, usePosTables } from "../hooks/use-pos"
import { useCreateOrder } from "@/features/order/hooks/use-orders"
import { usePaymentCalculation } from "@/features/cart/hooks/use-payment-calculation"
import { getStoredUser } from "@/features/auth/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Minus, ShoppingCart, CheckCircle2, User, Armchair, CreditCard } from "lucide-react"

export function PosDashboard() {
  const { data: menus = [], isLoading: loadingMenus } = usePosMenus()
  const { data: tables = [], isLoading: loadingTables } = usePosTables()
  const { mutateAsync: createOrder } = useCreateOrder()

  const { items, addItem, updateQuantity, clear, total, itemCount } = useCart()
  const { tax, service, totalPayment } = usePaymentCalculation(total)

  const [customerName, setCustomerName] = useState("")
  const [selectedTable, setSelectedTable] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  function formatPrice(cents: number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  async function handleProcessOrder() {
    if (items.length === 0) {
      alert("Keranjang masih kosong!")
      return
    }
    // Only require customer name for takeout/walk-in (no table selected)
    if (!selectedTable && !customerName.trim()) {
      alert("Nama pelanggan wajib untuk take-out!")
      return
    }

    setIsProcessing(true)
    try {
      // Filter out any invalid items and ensure menuId exists
      const validItems = items.filter(i => i.menuId).map(i => ({ 
        menuId: i.menuId, 
        quantity: i.quantity 
      }))

      if (validItems.length === 0) {
        alert("Item di keranjang tidak valid. Silakan hapus dan tambahkan kembali.")
        setIsProcessing(false)
        return
      }

      const user = getStoredUser()
      if (!user?.tenantId) {
        alert("Tenant tidak ditemukan. Silakan login ulang.")
        setIsProcessing(false)
        return
      }

      const payload = {
        tenantId: user.tenantId,
        tableId: selectedTable || null,
        customerName: customerName.trim() || undefined,
        items: validItems,
      }
      await createOrder(payload)
      setIsSuccess(true)
      setTimeout(() => {
        clear()
        setCustomerName("")
        setSelectedTable("")
        setPaymentMethod("cash")
        setIsSuccess(false)
      }, 2000)
    } catch (e) {
      console.error(e)
      alert("Gagal memproses pesanan")
    } finally {
      setIsProcessing(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h2 className="text-2xl font-bold">Pesanan Berhasil!</h2>
        <p className="text-muted-foreground">Pesanan atas nama {customerName} telah dikirim ke dapur.</p>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] overflow-hidden">
      {/* Left Pane: Menus */}
      <div className="flex-1 overflow-y-auto p-4 bg-muted/20">
        <h1 className="text-2xl font-bold mb-4">Menu</h1>
        {loadingMenus ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {menus.map((menu) => (
              <div key={menu.id} className="bg-white border rounded-xl overflow-hidden hover:shadow-md transition cursor-pointer flex flex-col" onClick={() => addItem({ menuId: menu.id, name: menu.name, price: menu.price })}>
                <div className="aspect-video bg-neutral-100 relative">
                  {menu.imageUrl ? (
                    <img src={menu.imageUrl} alt={menu.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400">No Image</div>
                  )}
                </div>
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-medium text-sm line-clamp-1">{menu.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">{formatPrice(menu.price)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Pane: Cart & Checkout */}
      <div className="w-96 border-l bg-white flex flex-col shadow-xl z-10">
        <div className="p-4 border-b flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <h2 className="font-bold text-lg">Keranjang ({itemCount})</h2>
          </div>
          {items.length > 0 && (
            <button 
              onClick={clear}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Kosongkan
            </button>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              Belum ada pesanan
            </div>
          ) : (
            items.map((item) => (
              <div key={item.menuId} className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <h4 className="text-sm font-medium leading-none">{item.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{formatPrice(item.price)}</p>
                </div>
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
                  <button 
                    onClick={() => updateQuantity(item.menuId, item.quantity - 1)}
                    className="p-1 hover:bg-white rounded"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-xs font-medium w-4 text-center">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.menuId, item.quantity + 1)}
                    className="p-1 hover:bg-white rounded"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout Form */}
        <div className="border-t bg-muted/10 p-4 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center border rounded-lg overflow-hidden bg-white">
              <div className="p-2.5 bg-muted border-r"><Armchair className="h-4 w-4 text-muted-foreground" /></div>
              <select 
                className="flex-1 p-2.5 text-sm outline-none bg-transparent"
                value={selectedTable}
                onChange={e => setSelectedTable(e.target.value)}
              >
                <option value="">Takeout / Walk-in (Tanpa Meja)</option>
                {tables.map(t => (
                  <option key={t.id} value={t.id}>{t.name.replace(/meja/i, '').trim()} (Meja)</option>
                ))}
              </select>
            </div>

            <div className="flex items-center border rounded-lg overflow-hidden bg-white">
              <div className="p-2.5 bg-muted border-r"><User className="h-4 w-4 text-muted-foreground" /></div>
              <input 
                type="text" 
                placeholder="Nama Pelanggan" 
                className="flex-1 p-2.5 text-sm outline-none"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
              />
            </div>

            <div className="flex items-center border rounded-lg overflow-hidden bg-white">
              <div className="p-2.5 bg-muted border-r"><CreditCard className="h-4 w-4 text-muted-foreground" /></div>
              <select 
                className="flex-1 p-2.5 text-sm outline-none bg-transparent"
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
              >
                <option value="cash">Cash (Tunai)</option>
                <option value="qris">QRIS / E-Wallet</option>
                <option value="debit">Kartu Debit / Kredit</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Pajak (10%)</span>
              <span>{formatPrice(tax)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Service (5%)</span>
              <span>{formatPrice(service)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-1">
              <span>Total</span>
              <span>{formatPrice(totalPayment)}</span>
            </div>
          </div>

          <Button 
            className="w-full h-12 text-sm font-bold bg-green-600 hover:bg-green-700"
            disabled={items.length === 0 || isProcessing}
            onClick={handleProcessOrder}
          >
            {isProcessing ? "Memproses..." : "PROSES & BAYAR"}
          </Button>
        </div>
      </div>
    </div>
  )
}
