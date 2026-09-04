"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Plus, Minus, ShoppingBag, Image as ImageIcon, Search, ChevronUp, ChevronDown, Utensils } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

import { usePublicMenu } from "@/features/customer/hooks/use-public-order"
import { useCart } from "@/features/cart/context/cart-context"

export default function PublicMenuPage() {
  const { tableId } = useParams() as { tableId: string }
  const router = useRouter()
  
  const { data: menuData, isLoading, error } = usePublicMenu(tableId)
  const { items: cart, addItem, updateQuantity, itemCount: totalItems, total: totalPrice } = useCart()

  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [isCartExpanded, setIsCartExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 max-w-md mx-auto">
        <Skeleton className="h-10 w-full rounded-full" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    )
  }

  if (error || !menuData) {
    return (
      <div className="p-4 text-center mt-20 max-w-md mx-auto">
        <p className="text-destructive mb-4">Gagal memuat menu. Silakan coba lagi nanti.</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Coba Lagi</Button>
      </div>
    )
  }

  const { table, categories, menus } = menuData

  // Set default category if none selected and categories exist
  if (!activeCategory && categories.length > 0) {
    setActiveCategory(categories[0].id)
  }

  function formatPrice(cents: number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  function handleCheckout() {
    router.push(`/${tableId}/cart`)
    setIsCartExpanded(false)
  }

  const filteredMenus = menus.filter(
    (menu) =>
      menu.categoryId === activeCategory &&
      menu.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      menu.isAvailable
  )

  return (
    <div className="mx-auto max-w-md min-h-screen bg-neutral-50 shadow-lg flex flex-col relative border-x border-neutral-200">
      
      {/* 1. MOBILE HEADER STICKY */}
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-100 p-4 pb-2 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full text-primary">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">Flavor Junction</h1>
              <p className="text-xs text-muted-foreground">{table.name}</p>
            </div>
          </div>
        </div>

        {/* Search Bar Mikro */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari makanan atau minuman..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 bg-neutral-100 rounded-full text-xs outline-none focus:ring-1 focus:ring-primary/30 transition-all"
          />
        </div>

        {/* Kategori Kapsul Horizontal */}
        <div className="flex gap-2 overflow-x-auto pt-1 pb-1 no-scrollbar -mx-4 px-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={
                "px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all " +
                (activeCategory === cat.id
                  ? "bg-neutral-900 text-white shadow-sm"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200")
              }
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* 2. DAFTAR MENU SCROLLABLE */}
      <main className="flex-1 p-4 space-y-4 pb-32">
        {filteredMenus.length > 0 ? (
          filteredMenus.map((menu) => {
            const cartItem = cart.find((c) => c.menuId === menu.id)
            const qty = cartItem?.quantity || 0

            return (
              <div
                key={menu.id}
                className="flex gap-3 bg-white rounded-xl p-3 border border-neutral-100 shadow-sm transition-all"
              >
                {/* Image Grid */}
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-50 border border-neutral-100 flex items-center justify-center">
                  {menu.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={menu.imageUrl} alt={menu.name} className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-neutral-300" />
                  )}
                </div>

                {/* Deskripsi & Harga */}
                <div className="flex flex-1 flex-col justify-between py-0.5">
                  <div>
                    <h3 className="font-semibold text-sm text-neutral-800 leading-snug">{menu.name}</h3>
                    {menu.description && (
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-neutral-400 leading-normal">
                        {menu.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-bold text-xs text-neutral-900">
                      {formatPrice(menu.price)}
                    </span>

                    {/* Kontrol Penambah Keranjang */}
                    {qty === 0 ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 rounded-full px-3 text-[11px] font-bold border-neutral-200 text-neutral-800 hover:bg-neutral-50"
                        onClick={() => addItem({ menuId: menu.id, name: menu.name, price: menu.price })}
                      >
                        Tambah
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2.5 rounded-full border border-neutral-200 bg-white p-0.5 shadow-sm">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 rounded-full p-0 text-neutral-600"
                          onClick={() => updateQuantity(menu.id, qty - 1)}
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </Button>
                        <span className="text-[11px] font-bold w-3 text-center text-neutral-800">
                          {qty}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 rounded-full p-0 text-neutral-600"
                          onClick={() => updateQuantity(menu.id, qty + 1)}
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="py-12 text-center text-xs text-neutral-400">
            Menu tidak ditemukan di kategori ini.
          </div>
        )}
      </main>

      {/* 3. FLOATING CART & DETAILS EXPANDABLE BOTTOM SHEET */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-200 rounded-t-2xl shadow-[0_-8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 max-w-md mx-auto">
          
          {/* Header Keranjang untuk Toggle Details */}
          <button 
            type="button"
            onClick={() => setIsCartExpanded(!isCartExpanded)}
            className="w-full flex items-center justify-between px-4 py-2 bg-neutral-50 rounded-t-2xl border-b border-neutral-100"
          >
            <span className="text-xs font-semibold text-neutral-600 flex items-center gap-1">
              Detail Pesanan ({totalItems} Item)
            </span>
            {isCartExpanded ? <ChevronDown className="h-4 w-4 text-neutral-400" /> : <ChevronUp className="h-4 w-4 text-neutral-400" />}
          </button>

          {/* Area Rincian / Detail Order List (Muncul jika di-expand) */}
          {isCartExpanded && (
            <div className="p-4 max-h-48 overflow-y-auto space-y-3 bg-white divide-y divide-neutral-100">
              {cart.map((item) => (
                <div key={item.menuId} className="flex items-center justify-between pt-2 first:pt-0">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-neutral-800">{item.name}</span>
                    <span className="text-[10px] text-neutral-400">{formatPrice(item.price)} / pcs</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-neutral-700">{formatPrice(item.price * item.quantity)}</span>
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
            </div>
          )}

          {/* Bar Utama Aksi Kasir */}
          <div className="p-4 bg-white flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Total Pembayaran</span>
              <span className="font-extrabold text-base text-neutral-900">{formatPrice(totalPrice)}</span>
            </div>

            <Button
              size="default"
              className="rounded-full font-bold shadow-sm px-6 text-xs bg-neutral-900 text-white hover:bg-neutral-800 flex items-center gap-2 h-10"
              onClick={handleCheckout}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Pesan Sekarang
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
