"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { formatDateTime, formatIdr } from "@/lib/format"
import { PageHeader } from "@/components/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { TenantFilter } from "@/components/tenant-filter"
import { useMe } from "@/features/auth/hooks/use-me"
import { PaymentStatusBadge } from "../components/payment-status-badge"
import { usePaymentsList } from "../hooks/use-payment-status"
import { useTransactions } from "../hooks/use-transactions"
import type { PaymentStatus } from "../types/payment"

const TABS = [
  { value: "settled", label: "Settled" },
  { value: "online", label: "Online checkouts" },
] as const
type Tab = (typeof TABS)[number]["value"]

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  qris: "QRIS",
  other_qris: "QRIS",
  gopay: "GoPay",
  shopeepay: "ShopeePay",
  debit: "Debit / EDC",
  transfer: "Transfer",
  bank_transfer: "Bank transfer",
  credit_card: "Credit card",
}
const methodLabel = (m?: string | null) => (m ? (METHOD_LABEL[m] ?? m) : "—")

/** Money in: settled transactions (cash + online) and Midtrans checkouts. */
export function PaymentsPage() {
  const [tab, setTab] = useState<Tab>("settled")
  const [tenantId, setTenantId] = useState<string | null>(null)
  const { data: me } = useMe()

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Payments"
        description="Every settled bill and online checkout, refreshed automatically."
        actions={<TenantFilter value={tenantId} onChange={setTenantId} />}
      />

      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              tab === t.value
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "settled" ? (
        <SettledTable tenantId={tenantId} />
      ) : (
        <OnlineTable enabled={me?.scope === "TENANT" || !!tenantId} />
      )}
    </div>
  )
}

function SettledTable({ tenantId }: { tenantId: string | null }) {
  const { data = [], isLoading } = useTransactions(tenantId)
  const total = data.reduce((sum, t) => sum + t.totalAmount, 0)

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {data.length} payment(s) · <span className="font-medium text-foreground tabular-nums">{formatIdr(total)}</span>
      </p>
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <Th>Order</Th>
              <Th>Source</Th>
              <Th>Method</Th>
              <Th right>Subtotal</Th>
              <Th right>Tax + service</Th>
              <Th right>Total</Th>
              <Th>Date</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <SkeletonRows cols={7} />}
            {!isLoading && data.length === 0 && <EmptyRow cols={7} text="No payments recorded yet." />}
            {data.map((t) => (
              <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  #{t.orderId.slice(-6).toUpperCase()}
                </td>
                <td className="px-4 py-3">
                  {t.sessionId ? `${t.tableName ?? "Table"} · table bill` : t.tableName ?? "Takeout"}
                </td>
                <td className="px-4 py-3">{methodLabel(t.paymentMethod)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatIdr(t.subtotal)}</td>
                <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                  {formatIdr(t.taxAmount + t.serviceAmount)}
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">{formatIdr(t.totalAmount)}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("id-ID", { dateStyle: "short" }).format(new Date(t.createdAt))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const STATUS_TABS: { label: string; value?: PaymentStatus }[] = [
  { label: "All" },
  { label: "Pending", value: "pending" },
  { label: "Success", value: "success" },
  { label: "Failed", value: "failed" },
  { label: "Expired", value: "expired" },
]

function OnlineTable({ enabled }: { enabled: boolean }) {
  const [status, setStatus] = useState<PaymentStatus | undefined>()
  const { data = [], isLoading } = usePaymentsList(undefined, enabled)
  const rows = [...data]
    .filter((p) => !status || p.status === status)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))

  if (!enabled) {
    return <p className="text-sm text-muted-foreground">Choose a restaurant to see its online checkouts.</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setStatus(s.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              status === s.value ? "border-foreground bg-foreground text-background" : "hover:bg-muted",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <Th>Reference</Th>
              <Th>Pays for</Th>
              <Th right>Amount</Th>
              <Th>Status</Th>
              <Th>Method</Th>
              <Th>Created</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <SkeletonRows cols={6} />}
            {!isLoading && rows.length === 0 && <EmptyRow cols={6} text="No online checkouts found." />}
            {rows.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.midtransOrderId}</td>
                <td className="px-4 py-3">
                  {p.orderId ? `Order #${p.orderId.slice(-6).toUpperCase()}` : "Table bill"}
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">{formatIdr(p.amount)}</td>
                <td className="px-4 py-3">
                  <PaymentStatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3">{methodLabel(p.paymentType)}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(p.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={cn("px-4 py-2.5 font-medium text-muted-foreground", right ? "text-right" : "text-left")}>
      {children}
    </th>
  )
}

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={i} className="border-b last:border-0">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-20" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-12 text-center text-muted-foreground">
        {text}
      </td>
    </tr>
  )
}
