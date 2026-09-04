"use client"

import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useUserRole } from "@/features/auth/hooks/use-permissions"
import { PERMISSIONS, ROLES } from "@/constants/permissions"
import { usePermissions } from "@/features/permission/hooks/use-permissions"

import { useCreateRole, useUpdateRole } from "../hooks/use-roles"
import type { RoleRecord } from "../types"

// ─── Static permission groups from local constants (no API call needed) ───────

const PERMISSION_GROUPS: { label: string; perms: string[] }[] = [
  {
    label: "Tenant (Global)",
    perms: [PERMISSIONS.TENANT_LIST, PERMISSIONS.TENANT_VIEW, PERMISSIONS.TENANT_CREATE, PERMISSIONS.TENANT_UPDATE, PERMISSIONS.TENANT_DELETE],
  },
  {
    label: "Tenant (Scoped)",
    perms: [PERMISSIONS.TENANT_VIEW, PERMISSIONS.TENANT_MANAGE],
  },
  {
    label: "Users (Global)",
    perms: [PERMISSIONS.USER_LIST, PERMISSIONS.USER_VIEW, PERMISSIONS.USER_CREATE, PERMISSIONS.USER_UPDATE, PERMISSIONS.USER_DELETE],
  },
  {
    label: "Users (Scoped)",
    perms: [PERMISSIONS.USER_VIEW, PERMISSIONS.USER_MANAGE],
  },
  {
    label: "Roles (Global)",
    perms: [PERMISSIONS.ROLE_LIST, PERMISSIONS.ROLE_VIEW, PERMISSIONS.ROLE_CREATE, PERMISSIONS.ROLE_UPDATE, PERMISSIONS.ROLE_DELETE],
  },
  {
    label: "Roles (Scoped)",
    perms: [PERMISSIONS.ROLE_VIEW, PERMISSIONS.ROLE_MANAGE],
  },
  {
    label: "Permissions (Global)",
    perms: [PERMISSIONS.PERMISSION_LIST, PERMISSIONS.PERMISSION_VIEW, PERMISSIONS.PERMISSION_CREATE, PERMISSIONS.PERMISSION_UPDATE, PERMISSIONS.PERMISSION_DELETE],
  },
  {
    label: "Permissions (Scoped)",
    perms: [PERMISSIONS.PERMISSION_LIST, PERMISSIONS.PERMISSION_VIEW],
  },
  {
    label: "Category",
    perms: [PERMISSIONS.CATEGORY_LIST, PERMISSIONS.CATEGORY_VIEW, PERMISSIONS.CATEGORY_CREATE, PERMISSIONS.CATEGORY_UPDATE, PERMISSIONS.CATEGORY_DELETE, PERMISSIONS.CATEGORY_MANAGE],
  },
  {
    label: "Menu",
    perms: [PERMISSIONS.MENU_LIST, PERMISSIONS.MENU_VIEW, PERMISSIONS.MENU_CREATE, PERMISSIONS.MENU_UPDATE, PERMISSIONS.MENU_DELETE, PERMISSIONS.MENU_MANAGE],
  },
  {
    label: "Table",
    perms: [PERMISSIONS.TABLE_LIST, PERMISSIONS.TABLE_VIEW, PERMISSIONS.TABLE_CREATE, PERMISSIONS.TABLE_UPDATE, PERMISSIONS.TABLE_DELETE, PERMISSIONS.TABLE_MANAGE],
  },
  {
    label: "Order",
    perms: [PERMISSIONS.ORDER_LIST, PERMISSIONS.ORDER_VIEW, PERMISSIONS.ORDER_CREATE, PERMISSIONS.ORDER_UPDATE, PERMISSIONS.ORDER_DELETE, PERMISSIONS.ORDER_MANAGE],
  },
  {
    label: "Payment",
    perms: [PERMISSIONS.PAYMENT_LIST, PERMISSIONS.PAYMENT_VIEW, PERMISSIONS.PAYMENT_CREATE, PERMISSIONS.PAYMENT_MANAGE],
  },
]

function actionLabel(perm: string) {
  const action = perm.split(":")[1] ?? perm
  return action.charAt(0).toUpperCase() + action.slice(1)
}

// ─── Form schema ──────────────────────────────────────────────────────────────

const roleFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  scope: z.enum(["TENANT", "GLOBAL"]),
  permissions: z.array(z.string()).min(1, "Select at least one permission"),
})
type RoleFormValues = z.infer<typeof roleFormSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  editTarget?: RoleRecord
  filterTenantId?: string | null
}

export function RoleFormDialog({ open, onOpenChange, editTarget, filterTenantId }: Props) {
  const isEdit = !!editTarget
  const { mutate: create, isPending: creating } = useCreateRole(filterTenantId)
  const { mutate: update, isPending: updating } = useUpdateRole()
  const { role: userRole } = useUserRole()
  const { data: permissions = [], isLoading: loadingPermissions } = usePermissions()
  const isPending = creating || updating
  const canSetGlobal = userRole === ROLES.SUPER_ADMIN

  // Create a map of permission name → permission ID
  const permissionMap = useMemo(() => {
    const map = new Map<string, string>()
    permissions.forEach((p) => map.set(p.name, p.id))
    return map
  }, [permissions])

  // Filter permission groups based on user role
  const visibleGroups = useMemo(() => {
    if (userRole === ROLES.SUPER_ADMIN) {
      return PERMISSION_GROUPS // Show all groups for super admin
    }
    // For tenant users, hide "(Global)" groups
    return PERMISSION_GROUPS.filter((group) => !group.label.includes("(Global)"))
  }, [userRole])

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } =
    useForm<RoleFormValues>({
      resolver: zodResolver(roleFormSchema),
      defaultValues: { name: "", scope: "TENANT", permissions: [] },
    })

  const selected = watch("permissions")

  useEffect(() => {
    reset({
      name: editTarget?.name ?? "",
      scope: editTarget?.scope ?? "TENANT",
      permissions: editTarget?.permissions?.map((p) => p.name) ?? [],
    })
  }, [editTarget, open, reset])

  function toggle(perm: string) {
    const cur = selected ?? []
    setValue(
      "permissions",
      cur.includes(perm) ? cur.filter((p) => p !== perm) : [...cur, perm],
      { shouldValidate: true },
    )
  }

  function toggleGroup(perms: string[]) {
    const cur = selected ?? []
    const allOn = perms.every((p) => cur.includes(p))
    setValue(
      "permissions",
      allOn ? cur.filter((p) => !perms.includes(p)) : Array.from(new Set([...cur, ...perms])),
      { shouldValidate: true },
    )
  }

  function onSubmit(values: RoleFormValues) {
    // Convert permission names to permission IDs
    const permissionIds = values.permissions
      .map((name) => permissionMap.get(name))
      .filter((id): id is string => id !== undefined)

    if (isEdit) {
      update(
        { id: editTarget.id, name: values.name, permissionIds },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      create(
        { name: values.name, scope: values.scope, permissionIds },
        { onSuccess: () => onOpenChange(false) },
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Role" : "Add Role"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldSet disabled={isPending}>
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="role-name">Name</FieldLabel>
                <Input
                  id="role-name"
                  placeholder="e.g. Kitchen Staff"
                  aria-invalid={!!errors.name}
                  {...register("name")}
                />
                <FieldError errors={[errors.name]} />
              </Field>

              {canSetGlobal && !isEdit && (
                <Field data-invalid={!!errors.scope}>
                  <FieldLabel htmlFor="role-scope">Scope</FieldLabel>
                  <select
                    id="role-scope"
                    className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    {...register("scope")}
                  >
                    <option value="TENANT">Tenant</option>
                    <option value="GLOBAL">Global</option>
                  </select>
                  <FieldError errors={[errors.scope]} />
                </Field>
              )}

              <Field data-invalid={!!errors.permissions}>
                <FieldLabel>
                  Permissions
                  {isEdit && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      (re-select to update)
                    </span>
                  )}
                </FieldLabel>
                <div className="max-h-60 overflow-y-auto rounded-lg border p-3 space-y-4">
                  {loadingPermissions ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Loading permissions...
                    </div>
                  ) : (
                    visibleGroups.map((group) => {
                      const allOn = group.perms.every((p) => selected?.includes(p))
                      return (
                        <div key={group.label}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <input
                              type="checkbox"
                              id={`grp-${group.label}`}
                              checked={allOn}
                              onChange={() => toggleGroup(group.perms)}
                              className="size-3.5 rounded border-input"
                            />
                            <label
                              htmlFor={`grp-${group.label}`}
                              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer"
                            >
                              {group.label}
                            </label>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 pl-5">
                            {group.perms.map((perm) => (
                              <label key={perm} className="flex items-center gap-1.5 text-sm cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selected?.includes(perm) ?? false}
                                  onChange={() => toggle(perm)}
                                  className="size-3.5 rounded border-input"
                                />
                                {actionLabel(perm)}
                              </label>
                            ))}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
                <FieldError errors={[errors.permissions]} />
              </Field>
            </FieldGroup>
          </FieldSet>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || loadingPermissions}>
              {isPending ? "Saving…" : loadingPermissions ? "Loading…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
