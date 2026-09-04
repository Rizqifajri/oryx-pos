import { AlertCircle, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface OperationsStatusCardProps {
  activeOrders: number
  ordersToday: number
  menuCount: number
  tenantName: string
}

export function OperationsStatusCard({
  activeOrders,
  ordersToday,
  menuCount,
  tenantName,
}: OperationsStatusCardProps) {
  const needsAttention = activeOrders > 0

  return (
    <Card size="sm" className="shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s Operations</CardTitle>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Today
        </span>
      </CardHeader>
      <CardContent className="flex flex-col items-center py-4 text-center">
        {needsAttention ? (
          <>
            <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <AlertCircle className="size-8" />
            </div>
            <p className="text-sm font-semibold">{activeOrders} active order(s)</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Orders need attention at {tenantName}. Check the Order page to update status.
            </p>
          </>
        ) : (
          <>
            <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="size-8" />
            </div>
            <p className="text-sm font-semibold">Kitchen clear</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              No pending orders. {ordersToday} order(s) today · {menuCount} menu items listed.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
