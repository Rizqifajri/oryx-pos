"use client"

import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmationModal } from "@/components/confirmation-modals"
import { PermissionGuard } from "@/components/guards"
import { PERMISSIONS } from "@/constants/permissions"

import { useTenants, useDeleteTenant } from "../hooks/use-tenants"
import { TenantFormDialog } from "./tenant-form-dialog"
import type { Tenant } from "../types"

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(iso))
}

export function TenantSection() {
  const { data: tenants = [], isLoading } = useTenants()
  const { mutate: deleteTenant, isPending: deleting } = useDeleteTenant()

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Tenant | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  function openAdd() {
    setEditTarget(undefined)
    setFormOpen(true)
  }

  function openEdit(tenant: Tenant) {
    setEditTarget(tenant)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Tenants</h2>
        <PermissionGuard permissions={PERMISSIONS.TENANT_CREATE}>
          <Button size="sm" onClick={openAdd}>
            <Plus />
            Add Tenant
          </Button>
        </PermissionGuard>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Slug</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3 text-right"><Skeleton className="ml-auto h-7 w-16" /></td>
                </tr>
              ))}

            {!isLoading && tenants.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No tenants yet. Add one to get started.
                </td>
              </tr>
            )}

            {tenants.map((tenant) => (
              <tr key={tenant.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{tenant.name}</td>
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{tenant.slug}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(tenant.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <PermissionGuard permissions={PERMISSIONS.TENANT_UPDATE}>
                      <Button size="icon-sm" variant="ghost" onClick={() => openEdit(tenant)}>
                        <Pencil />
                        <span className="sr-only">Edit</span>
                      </Button>
                    </PermissionGuard>
                    <PermissionGuard permissions={PERMISSIONS.TENANT_DELETE}>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(tenant.id)}
                      >
                        <Trash2 />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </PermissionGuard>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TenantFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editTarget={editTarget}
      />

      <ConfirmationModal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete tenant"
        description="This will permanently delete the tenant and all associated data."
        confirmLabel="Delete"
        isPending={deleting}
        onConfirm={() => {
          if (deleteTarget) {
            deleteTenant(deleteTarget, { onSuccess: () => setDeleteTarget(null) })
          }
        }}
      />
    </div>
  )
}
