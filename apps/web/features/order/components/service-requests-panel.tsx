"use client"

import { BellRing, Check, GlassWater, ReceiptText, UtensilsCrossed } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { PermissionGuard } from "@/components/guards"
import { minutesAgo } from "@/lib/format"
import { PERMISSIONS } from "@/constants/permissions"
import {
  useHandleServiceRequest,
  useServiceRequests,
} from "@/features/table/hooks/use-table-sessions"
import type { ServiceRequestType } from "@/features/table/types"

const REQUEST_META: Record<ServiceRequestType, { label: string; icon: typeof BellRing }> = {
  call_waiter: { label: "Call waiter", icon: BellRing },
  water: { label: "Water", icon: GlassWater },
  cutlery: { label: "Cutlery", icon: UtensilsCrossed },
  bill: { label: "Bring the bill", icon: ReceiptText },
}

/** Queue of guest requests from the QR menu ("Panggil pelayan", etc.). */
export function ServiceRequestsPanel({ tenantId }: { tenantId?: string | null }) {
  const { data: requests = [] } = useServiceRequests(tenantId)
  const handle = useHandleServiceRequest()

  if (requests.length === 0) return null

  return (
    <section aria-label="Guest requests" className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
      <h2 className="mb-2 text-sm font-semibold">Guest requests ({requests.length})</h2>
      <ul className="flex flex-wrap gap-2">
        {requests.map((request) => {
          const meta = REQUEST_META[request.type]
          const Icon = meta.icon
          return (
            <li key={request.id} className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
              <Icon className="size-4 text-amber-700" />
              <span className="font-semibold">{request.tableName}</span>
              <span>{meta.label}</span>
              <span className="text-xs text-muted-foreground">{minutesAgo(request.createdAt)}</span>
              <PermissionGuard permissions={[PERMISSIONS.ORDER_UPDATE, PERMISSIONS.ORDER_MANAGE]} requireAll={false}>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7"
                  disabled={handle.isPending}
                  onClick={() =>
                    handle.mutate(request.id, { onError: (e) => toast.error(e.message) })
                  }
                >
                  <Check className="mr-1 size-3.5" /> Done
                </Button>
              </PermissionGuard>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
