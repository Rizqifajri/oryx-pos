"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { PermissionGuard } from "@/components/guards"
import { PERMISSIONS } from "@/constants/permissions"

import { useOrders, useUpdateOrderStatus, useCreateTransaction } from "../hooks/use-orders"
import type { Order, OrderStatus } from "../types"

const STATUS_TABS: { label: string; value: OrderStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "New", value: "NEW" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Canceled", value: "CANCELED" },
]

const STATUS_STYLES: Record<OrderStatus, string> = {
  NEW: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
  PROCESSING: "bg-blue-50 text-blue-700 ring-blue-600/20",
  COMPLETED: "bg-green-50 text-green-700 ring-green-600/20",
  CANCELED: "bg-red-50 text-red-700 ring-red-600/20",
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: "New",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  CANCELED: "Canceled",
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso))
}

function NextStatusButton({ order }: { order: Order }) {
  const { mutateAsync: updateStatus, isPending: isUpdating } = useUpdateOrderStatus()
  const { mutateAsync: createTransaction, isPending: isPaying } = useCreateTransaction()

  const [isFinishing, setIsFinishing] = useState(false)

  if (order.status === "NEW") {
    return (
      <PermissionGuard permissions={PERMISSIONS.ORDER_UPDATE}>
        <Button
          size="sm"
          variant="outline"
          disabled={isUpdating}
          onClick={() => updateStatus({ id: order.id, status: "PROCESSING" })}
        >
          Process
        </Button>
      </PermissionGuard>
    )
  }
  if (order.status === "PROCESSING") {
    return (
      <PermissionGuard permissions={PERMISSIONS.ORDER_UPDATE}>
        <Button
          size="sm"
          disabled={isUpdating || isPaying || isFinishing}
          onClick={async () => {
            setIsFinishing(true)
            try {
              await updateStatus({ id: order.id, status: "COMPLETED" })
              await createTransaction({ orderId: order.id })
            } catch (e) {
              console.error("Failed to complete order and transaction", e)
            } finally {
              setIsFinishing(false)
            }
          }}
        >
          {isFinishing ? "Processing..." : "Pesanan Selesai"}
        </Button>
      </PermissionGuard>
    )
  }
  return null
}

function CancelButton({ order }: { order: Order }) {
  const { mutate: updateStatus, isPending } = useUpdateOrderStatus()

  if (order.status === "NEW" || order.status === "PROCESSING") {
    return (
      <PermissionGuard permissions={PERMISSIONS.ORDER_UPDATE}>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          disabled={isPending}
          onClick={() => updateStatus({ id: order.id, status: "CANCELED" })}
        >
          Cancel
        </Button>
      </PermissionGuard>
    )
  }
  return null
}


interface OrderSectionProps {
  tenantId?: string | null
}

export function OrderSection({ tenantId }: OrderSectionProps = {}) {
  const [activeTab, setActiveTab] = useState<OrderStatus | "ALL">("ALL")
  
  // Build filters object conditionally
  const filters = {
    ...(tenantId ? { tenantId } : {}),
    ...(activeTab !== "ALL" ? { status: activeTab } : {}),
  }
  const hasFilters = Object.keys(filters).length > 0

  const { data: orders = [], isLoading } = useOrders(hasFilters ? filters : undefined)

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.value
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Order</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Table</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Customer</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Items</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Total</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Time</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3 text-right"><Skeleton className="ml-auto h-4 w-20" /></td>
                  <td className="px-4 py-3 text-center"><Skeleton className="mx-auto h-5 w-20 rounded-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-4 py-3 text-right"><Skeleton className="ml-auto h-7 w-24" /></td>
                </tr>
              ))}

            {!isLoading && orders.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  No orders found.
                </td>
              </tr>
            )}

            {orders.map((order: any) => (
              <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  #{order.id.slice(-6).toUpperCase()}
                </td>
                <td className="px-4 py-3 font-bold text-lg">
                  <span className="text-2xl font-bold">
                    {order.tableName ? order.tableName.replace(/meja/i, '').trim() : '-'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-blue-600">
                    {order.customerName || 'Guest'}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {order.items.length} {order.items.length === 1 ? "item" : "items"}
                  {order.notes && (
                    <p className="text-xs italic truncate max-w-32">{order.notes}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">
                  {formatPrice(order.totalPrice)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                    STATUS_STYLES[order.status as OrderStatus],
                  )}>
                    {STATUS_LABEL[order.status as OrderStatus]}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {formatTime(order.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <NextStatusButton order={order} />
                    <CancelButton order={order} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
