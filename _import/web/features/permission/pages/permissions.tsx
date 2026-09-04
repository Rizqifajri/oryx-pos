"use client"

import { PermissionSection } from "../components/permission-section"

export function PermissionsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Permission Management</h1>
        <p className="text-sm text-muted-foreground">Manage all system permissions and access controls.</p>
      </div>
      <PermissionSection />
    </div>
  )
}
