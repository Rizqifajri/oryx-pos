import Link from "next/link"
import { Building2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TenantListItem } from "../types"

interface TenantListCardProps {
  tenants: TenantListItem[]
  loading?: boolean
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso))
}

export function TenantListCard({ tenants, loading }: TenantListCardProps) {
  const display = tenants.slice(0, 6)

  return (
    <Card size="sm" className="shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Client Tenants</CardTitle>
        <Building2 className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : display.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tenants registered yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {display.map((tenant) => (
              <li
                key={tenant.tenantId}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{tenant.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{tenant.slug}</p>
                </div>
                <span className="shrink-0 text-right text-muted-foreground tabular-nums">
                  {tenant.userCount} users
                  <br />
                  <span className="text-[10px]">{formatDate(tenant.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {!loading && tenants.length > 0 && (
          <Link
            href="/tenants"
            className="mt-4 inline-block text-xs font-medium text-primary hover:underline"
          >
            Manage all tenants →
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
