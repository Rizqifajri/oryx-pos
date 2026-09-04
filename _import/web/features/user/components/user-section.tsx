"use client"

import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmationModal } from "@/components/confirmation-modals"
import { PermissionGuard } from "@/components/guards"
import { PERMISSIONS } from "@/constants/permissions"
import { cn } from "@/lib/utils"
import type { ApiError } from "@/lib/api"
import { useRoles } from "@/features/role/hooks/use-roles"

import { useUsers, useDeleteUser } from "../hooks/use-users"
import { UserFormDialog } from "./user-form-dialog"
import type { User } from "../types"

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(iso))
}

interface UserSectionProps {
  tenantId?: string | null
}

export function UserSection({ tenantId }: UserSectionProps = {}) {
  const { data: users = [], isLoading, isError, error } = useUsers(tenantId)
  const { data: roles = [] } = useRoles(tenantId)
  const { mutate: deleteUser, isPending: deleting } = useDeleteUser()

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<User | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const apiError = error as ApiError | null

  function openAdd() {
    setEditTarget(undefined)
    setFormOpen(true)
  }

  function openEdit(user: User) {
    setEditTarget(user)
    setFormOpen(true)
  }

  function roleOf(roleId: string) {
    return roles.find((r) => r.id === roleId)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Users</h2>
        <PermissionGuard permissions={PERMISSIONS.USER_MANAGE}>
          <Button size="sm" onClick={openAdd}>
            <Plus />
            Add User
          </Button>
        </PermissionGuard>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-44" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3 text-right"><Skeleton className="ml-auto h-7 w-16" /></td>
                </tr>
              ))}

            {!isLoading && isError && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center">
                  <p className="text-sm font-medium text-destructive">
                    {apiError?.statusCode === 403
                      ? "You don't have permission to view users."
                      : (apiError?.message ?? "Failed to load users.")}
                  </p>
                </td>
              </tr>
            )}

            {!isLoading && !isError && users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No users found.
                </td>
              </tr>
            )}

            {users.map((user) => {
              const role = roleOf(user.roleId)
              return (
                <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    {role ? (
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                        role.scope === "GLOBAL"
                          ? "bg-purple-50 text-purple-700 ring-purple-600/20"
                          : "bg-blue-50 text-blue-700 ring-blue-600/20",
                      )}>
                        {role.name}
                        <span className="opacity-60">
                          {role.scope === "GLOBAL" ? "· Global" : "· Tenant"}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs font-mono">{user.roleId.slice(-8)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <PermissionGuard permissions={PERMISSIONS.USER_MANAGE}>
                        <Button size="icon-sm" variant="ghost" onClick={() => openEdit(user)}>
                          <Pencil />
                          <span className="sr-only">Edit</span>
                        </Button>
                      </PermissionGuard>
                      <PermissionGuard permissions={PERMISSIONS.USER_MANAGE}>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(user.id)}
                        >
                          <Trash2 />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </PermissionGuard>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editTarget={editTarget}
        filterTenantId={tenantId}
      />

      <ConfirmationModal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete user"
        description="This will permanently delete the user account."
        confirmLabel="Delete"
        isPending={deleting}
        onConfirm={() => {
          if (deleteTarget) {
            deleteUser(deleteTarget, { onSuccess: () => setDeleteTarget(null) })
          }
        }}
      />
    </div>
  )
}
