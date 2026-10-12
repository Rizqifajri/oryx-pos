"use client"

import { PageHeader } from "@/components/page-header"
import { TenantSection } from "../components/tenant-section"

export function TenantPage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Tenants" description="Every restaurant on the platform." />
      <TenantSection />
    </div>
  )
}
