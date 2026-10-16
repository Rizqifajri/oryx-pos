"use client"

import { useState } from "react"
import { PageHeader } from "@/components/page-header"
import { TenantFilter } from "@/components/tenant-filter"
import { useMe } from "@/features/auth/hooks/use-me"
import { FeedbackSection } from "../components/feedback-section"

export function FeedbacksPage() {
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)
  const { data: me } = useMe()

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Customer Feedbacks & Ratings"
        description="Pantau ulasan kepuasan tamu dan performa menu berdasarkan respon emoticon pelanggan."
        actions={
          me?.scope === "GLOBAL" && (
            <TenantFilter value={selectedTenantId} onChange={setSelectedTenantId} />
          )
        }
      />
      <FeedbackSection tenantId={selectedTenantId} />
    </div>
  )
}

