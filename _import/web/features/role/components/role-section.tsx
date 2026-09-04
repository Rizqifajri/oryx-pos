"use client"

import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmationModal } from "@/components/confirmation-modals"
import { PERMISSIONS } from "@/constants/permissions"
import { useHasAnyPermission } from "@/features/auth/hooks/use-permissions"

import type { ApiError } from "@/lib/api"

import { useRoles, useDeleteRole } from "../hooks/use-roles"
import { RoleFormDialog } from "./role-form-dialog"
import type { RoleRecord } from "../types"

interface RoleSectionProps {
  tenantId?: string | null
}

export function RoleSection({ tenantId }: RoleSectionProps = {}) {
  const { data: roles = [], isLoading, isError, error } = useRoles(tenantId)
  const apiError = error as ApiError | null
  const { mutate: deleteRole, isPending: deleting } = useDeleteRole()
  const { hasPermission: canManage } = useHasAnyPermission(PERMISSIONS.ROLE_CREATE, PERMISSIONS.ROLE_MANAGE)

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<RoleRecord | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  function openAdd() {
    setEditTarget(undefined)
    setFormOpen(true)
  }

  function openEdit(role: RoleRecord) {
    setEditTarget(role)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Roles</h2>
        {canManage && (
          <Button size="sm" onClick={openAdd}>
            <Plus />
            Add Role
          </Button>
        )}
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Scope</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Created</th>
              {canManage && (
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  {canManage && (
                    <td className="px-4 py-3 text-right"><Skeleton className="ml-auto h-7 w-16" /></td>
                  )}
                </tr>
              ))}

            {!isLoading && isError && (
              <tr>
                <td colSpan={canManage ? 4 : 3} className="px-4 py-8 text-center">
                  <p className="text-sm font-medium text-destructive">
                    {apiError?.statusCode === 403
                      ? "You don't have permission to view roles."
                      : (apiError?.message ?? "Failed to load roles.")}
                  </p>
                </td>
              </tr>
            )}

            {!isLoading && !isError && roles.length === 0 && (
              <tr>
                <td colSpan={canManage ? 4 : 3} className="px-4 py-8 text-center text-muted-foreground">
                  No roles found.
                </td>
              </tr>
            )}

            {roles.map((role) => (
              <tr key={role.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{role.name}</td>
                <td className="px-4 py-3">
                  <span className={
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset " +
                    (role.scope === "GLOBAL"
                      ? "bg-purple-50 text-purple-700 ring-purple-600/20"
                      : "bg-blue-50 text-blue-700 ring-blue-600/20")
                  }>
                    {role.scope === "GLOBAL" ? "Global" : "Tenant"}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(role.createdAt))}
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon-sm" variant="ghost" onClick={() => openEdit(role)}>
                        <Pencil />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(role.id)}
                      >
                        <Trash2 />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RoleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editTarget={editTarget}
        filterTenantId={tenantId}
      />

      <ConfirmationModal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete role"
        description="This will permanently delete the role. Users assigned this role may lose access."
        confirmLabel="Delete"
        isPending={deleting}
        onConfirm={() => {
          if (deleteTarget) {
            deleteRole(deleteTarget, { onSuccess: () => setDeleteTarget(null) })
          }
        }}
      />
    </div>
  )
}
