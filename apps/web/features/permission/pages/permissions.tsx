"use client"

import { PageHeader } from "@/components/page-header"
import { PermissionSection } from "../components/permission-section"

export function PermissionsPage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Permissions"
        description="The system-wide list of actions that roles can be granted."
      />
      <PermissionSection />
    </div>
  )
}
