"use client"

import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmationModal } from "@/components/confirmation-modals"
import { PermissionGuard } from "@/components/guards"
import { PERMISSIONS } from "@/constants/permissions"

import { usePermissions, useDeletePermission } from "../hooks/use-permissions"
import { PermissionFormDialog } from "./permission-form-dialog"
import type { Permission } from "../types"

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(iso))
}

export function PermissionSection() {
  const { data: permissions = [], isLoading } = usePermissions()
  const { mutate: deletePermission, isPending: deleting } = useDeletePermission()

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Permission | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  function openAdd() {
    setEditTarget(undefined)
    setFormOpen(true)
  }

  function openEdit(permission: Permission) {
    setEditTarget(permission)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Permissions</h2>
        <PermissionGuard permissions={PERMISSIONS.PERMISSION_CREATE}>
          <Button size="sm" onClick={openAdd}>
            <Plus />
            Add Permission
          </Button>
        </PermissionGuard>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3 text-right"><Skeleton className="ml-auto h-7 w-16" /></td>
                </tr>
              ))}

            {!isLoading && permissions.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  No permissions yet. Add one to get started.
                </td>
              </tr>
            )}

            {permissions.map((permission) => (
              <tr key={permission.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium font-mono text-xs">{permission.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(permission.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <PermissionGuard permissions={PERMISSIONS.PERMISSION_UPDATE}>
                      <Button size="icon-sm" variant="ghost" onClick={() => openEdit(permission)}>
                        <Pencil />
                        <span className="sr-only">Edit</span>
                      </Button>
                    </PermissionGuard>
                    <PermissionGuard permissions={PERMISSIONS.PERMISSION_DELETE}>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(permission.id)}
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

      <PermissionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editTarget={editTarget}
      />

      <ConfirmationModal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete permission"
        description="This will permanently delete the permission. Roles using this permission will lose access."
        confirmLabel="Delete"
        isPending={deleting}
        onConfirm={() => {
          if (deleteTarget) {
            deletePermission(deleteTarget, { onSuccess: () => setDeleteTarget(null) })
          }
        }}
      />
    </div>
  )
}
