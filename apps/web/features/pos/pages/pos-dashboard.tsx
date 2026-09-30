"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Armchair, ImageIcon, Minus, Plus, Search, ShoppingBag, ShoppingCart, User } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatIdr } from "@/lib/format"
import { cn } from "@/lib/utils"
import { getStoredUser } from "@/features/auth/hooks/use-auth"
import { useCart } from "@/features/cart/context/cart-context"
import { usePaymentCalculation } from "@/features/cart/hooks/use-payment-calculation"
import { useCategories } from "@/features/menu/hooks/use-categories"
import { useCreateOrder } from "@/features/order/hooks/use-orders"
import { useActiveSessions } from "@/features/table/hooks/use-table-sessions"
import { useTables } from "@/features/table/hooks/use-tables"
import type { ApiError } from "@/lib/api"
import { usePosMenus } from "../hooks/use-pos"

type OrderType = "dine_in" | "takeout"

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "qris", label: "QRIS / E-wallet" },
  { value: "debit", label: "Debit / Credit card" },
]

/**
 * Cashier POS. Dine-in orders are added to the table's tab — the same bill
 * guests see on their phone — and paid once from Tables → Settle. Takeout
 * orders are paid per order when completed on the Orders board.
 */
export function PosDashboard() {
  const router = useRouter()
  const { data: menus = [], isLoading: loadingMenus } = usePosMenus()
  const { data: categories = [] } = useCategories()
  const { data: tables = [] } = useTables()
  const { data: sessions = [] } = useActiveSessions()
  const { mutateAsync: createOrder, isPending } = useCreateOrder()

  const { items, addItem, updateQuantity, clear, total, itemCount } = useCart()
  const { tax, service, totalPayment } = usePaymentCalculation(total)

  const [search, setSearch] = useState("")
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [orderType, setOrderType] = useState<OrderType>("dine_in")
  const [tableId, setTableId] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("cash")

  const sessionByTable = useMemo(() => new Map(sessions.map((s) => [s.tableId, s])), [sessions])
  const quantityOf = (menuId: string) => items.find((i) => i.menuId === menuId)?.quantity ?? 0

  const visibleMenus = menus.filter(
    (m) =>
      (!categoryId || m.categoryId === categoryId) &&
      m.name.toLowerCase().includes(search.trim().toLowerCase()),
  )
  const usedCategories = categories.filter((c) => menus.some((m) => m.categoryId === c.id))

  const selectedSession = tableId ? sessionByTable.get(tableId) : undefined
  const tableLocked = selectedSession?.status === "billing"
  const missing =
    items.length === 0
      ? "Add items to the order"
      : orderType === "dine_in" && !tableId
        ? "Choose a table"
        : orderType === "takeout" && !customerName.trim()
          ? "Enter the customer name"
          : tableLocked
            ? "This table is paying — unlock it from Tables first"
            : null

  async function submit() {
    const user = getStoredUser()
    if (!user?.tenantId) {
      toast.error("Tenant not found. Please sign in again.")
      return
    }
    const tableName = tables.find((t) => t.id === tableId)?.name
    try {
      await createOrder({
        tenantId: user.tenantId,
        tableId: orderType === "dine_in" ? tableId : null,
        customerName: customerName.trim() || undefined,
        // Dine-in is paid when the table's bill is settled.
        paymentMethod: orderType === "takeout" ? paymentMethod : undefined,
        items: items.map((i) => ({ menuId: i.menuId, quantity: i.quantity })),
      })
      toast.success(
        orderType === "dine_in" ? `Sent to kitchen · added to ${tableName}'s bill` : "Takeout order sent to kitchen",
        { action: { label: "View orders", onClick: () => router.push("/order") } },
      )
      clear()
      setCustomerName("")
      setTableId("")
    } catch (error) {
      toast.error((error as ApiError).message ?? "Failed to create order")
    }
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] overflow-hidden">
      {/* Menu */}
      <section className="flex flex-1 flex-col overflow-hidden">
        <div className="space-y-3 border-b p-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">POS Cashier</h1>
            <div className="relative ml-auto w-full max-w-xs">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search menu…"
                className="h-9 w-full rounded-md border bg-background pr-3 pl-8 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {[{ id: null, name: "All" }, ...usedCategories].map((c) => (
              <button
                key={c.id ?? "all"}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-sm transition-colors",
                  categoryId === c.id ? "border-foreground bg-foreground text-background" : "hover:bg-muted",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-muted/20 p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {loadingMenus &&
              Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-lg" />)}
            {!loadingMenus &&
              visibleMenus.map((menu) => {
                const qty = quantityOf(menu.id)
                return (
                  <button
                    key={menu.id}
                    type="button"
                    onClick={() => addItem({ menuId: menu.id, name: menu.name, price: menu.price })}
                    className={cn(
                      "relative flex flex-col overflow-hidden rounded-lg border bg-card text-left transition hover:shadow-md",
                      qty > 0 && "ring-2 ring-foreground",
                    )}
                  >
                    <div className="aspect-video bg-muted">
                      {menu.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={menu.imageUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <div className="grid size-full place-items-center text-muted-foreground">
                          <ImageIcon className="size-5" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-1 text-sm font-medium">{menu.name}</p>
                      <p className="text-sm text-muted-foreground tabular-nums">{formatIdr(menu.price)}</p>
                    </div>
                    {qty > 0 && (
                      <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-foreground text-xs font-semibold text-background tabular-nums">
                        {qty}
                      </span>
                    )}
                  </button>
                )
              })}
            {!loadingMenus && visibleMenus.length === 0 && (
              <p className="col-span-full py-12 text-center text-sm text-muted-foreground">No menu items found.</p>
            )}
          </div>
        </div>
      </section>

      {/* Order */}
      <aside className="flex w-96 shrink-0 flex-col border-l bg-background">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <ShoppingCart className="size-4" /> Current order ({itemCount})
          </h2>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={clear}>
              Clear
            </Button>
          )}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <ShoppingBag className="size-6" />
              Tap a menu item to add it.
            </div>
          ) : (
            items.map((item) => (
              <div key={item.menuId} className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{formatIdr(item.price)}</p>
                </div>
                <div className="flex items-center gap-1 rounded-md border p-0.5">
                  <button
                    type="button"
                    aria-label={`Decrease ${item.name}`}
                    onClick={() => updateQuantity(item.menuId, item.quantity - 1)}
                    className="grid size-7 place-items-center rounded hover:bg-muted"
                  >
                    <Minus className="size-3" />
                  </button>
                  <span className="w-5 text-center text-sm tabular-nums">{item.quantity}</span>
                  <button
                    type="button"
                    aria-label={`Increase ${item.name}`}
                    onClick={() => updateQuantity(item.menuId, item.quantity + 1)}
                    className="grid size-7 place-items-center rounded hover:bg-muted"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
                <span className="w-24 text-right text-sm tabular-nums">{formatIdr(item.price * item.quantity)}</span>
              </div>
            ))
          )}
        </div>

        <div className="space-y-3 border-t p-4">
          <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1" role="radiogroup" aria-label="Order type">
            {(
              [
                ["dine_in", "Dine-in"],
                ["takeout", "Takeout"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={orderType === value}
                onClick={() => setOrderType(value)}
                className={cn(
                  "rounded px-3 py-1.5 text-sm font-medium",
                  orderType === value ? "bg-background shadow-sm" : "text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {orderType === "dine_in" ? (
            <>
              <label className="flex items-center overflow-hidden rounded-md border">
                <span className="border-r bg-muted p-2.5">
                  <Armchair className="size-4 text-muted-foreground" />
                </span>
                <select
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  className="flex-1 bg-transparent p-2.5 text-sm outline-none"
                >
                  <option value="">Choose a table…</option>
                  {tables.map((t) => {
                    const s = sessionByTable.get(t.id)
                    const suffix = !s
                      ? "free"
                      : s.status === "billing"
                        ? "paying"
                        : `open tab · ${formatIdr(s.bill.totalAmount)}`
                    return (
                      <option key={t.id} value={t.id}>
                        {t.name} — {suffix}
                      </option>
                    )
                  })}
                </select>
              </label>
              <p className="text-xs text-muted-foreground">
                {selectedSession
                  ? `Adds to the table's open bill (${selectedSession.orderCount} order(s)). Guests see it on their phone.`
                  : "Opens a tab for the table. Settle it from Tables when the guests pay."}
              </p>
            </>
          ) : (
            <>
              <label className="flex items-center overflow-hidden rounded-md border">
                <span className="border-r bg-muted p-2.5">
                  <User className="size-4 text-muted-foreground" />
                </span>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  className="flex-1 p-2.5 text-sm outline-none"
                />
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-md border bg-background p-2.5 text-sm"
                aria-label="Payment method"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </>
          )}

          <dl className="space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatIdr(total)}</dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>Tax (10%)</dt>
              <dd className="tabular-nums">{formatIdr(tax)}</dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>Service (5%)</dt>
              <dd className="tabular-nums">{formatIdr(service)}</dd>
            </div>
            <div className="flex justify-between border-t pt-1 text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatIdr(totalPayment)}</dd>
            </div>
          </dl>

          <Button className="h-11 w-full" disabled={!!missing || isPending} onClick={() => void submit()}>
            {isPending ? "Sending…" : missing ?? (orderType === "dine_in" ? "Send to kitchen" : "Create takeout order")}
          </Button>
        </div>
      </aside>
    </div>
  )
}
