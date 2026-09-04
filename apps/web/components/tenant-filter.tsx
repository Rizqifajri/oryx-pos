"use client"

import { Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useTenants } from "@/features/tenant/hooks/use-tenants"
import { useMe } from "@/features/auth/hooks/use-me"

interface TenantFilterProps {
  value: string | null
  onChange: (tenantId: string | null) => void
  label?: string
}

export function TenantFilter({ value, onChange, label = "Filter by Tenant" }: TenantFilterProps) {
  const { data: user } = useMe()
  const { data: tenants = [], isLoading, isError } = useTenants()

  // Hide filter for TENANT-scoped users (they only have 1 tenant, no need to filter)
  if (user?.scope === "TENANT") {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-48" />
      </div>
    )
  }

  if (isError) {
    return null // Silently hide on error
  }

  return (
    <div className="flex items-center gap-2">
      <Filter className="h-4 w-4 text-muted-foreground" />
      <Select value={value || "all"} onValueChange={(val) => onChange(val === "all" ? null : val)}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Tenants</SelectItem>
          {tenants.map((tenant) => (
            <SelectItem key={tenant.id} value={tenant.id}>
              {tenant.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value && (
        <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
          Clear
        </Button>
      )}
    </div>
  )
}
