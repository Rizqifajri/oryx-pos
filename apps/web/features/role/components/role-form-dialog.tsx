"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Search } from "lucide-react"

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
import { ROLES } from "@/constants/permissions"
import { usePermissions } from "@/features/permission/hooks/use-permissions"

import { useCreateRole, useUpdateRole } from "../hooks/use-roles"
import type { RoleRecord } from "../types"

// ─── Labels ───────────────────────────────────────────────────────────────────
// Permissions are named `resource:action`. Groups are built from whatever the
// API returns for this user, so a checkbox can never refer to a permission the
// user is not allowed to assign — the old hard-coded list silently dropped them.

const RESOURCE_LABELS: Record<string, string> = {
  tenant: "Restaurant",
  user: "Users",
  role: "Roles",
  permission: "Permissions",
  category: "Menu categories",
  menu: "Menu & inventory",
  table: "Tables",
  order: "Orders",
  customer: "Customers",
  transaction: "Payments",
}

// Read actions first, then writes — the order people think in.
const ACTION_ORDER = ["list", "view", "create", "update", "delete", "manage-own", "manage"]

const ACTION_LABELS: Record<string, { label: string; hint: string }> = {
  list: { label: "View list", hint: "Open the page and see all records" },
  view: { label: "View details", hint: "Open a single record" },
  create: { label: "Create", hint: "Add new records" },
  update: { label: "Edit", hint: "Change existing records" },
  delete: { label: "Delete", hint: "Remove records" },
  manage: { label: "Full write access", hint: "Create, edit and delete in one" },
  "manage-own": { label: "Manage own settings", hint: "Edit this restaurant's own settings" },
}

function splitPermission(name: string) {
  const i = name.indexOf(":")
  return i === -1
    ? { resource: name, action: name }
    : { resource: name.slice(0, i), action: name.slice(i + 1) }
}

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

type PermItem = { id: string; name: string; action: string; label: string; hint: string }
type PermGroup = { resource: string; label: string; items: PermItem[] }

function groupPermissions(perms: { id: string; name: string }[]): PermGroup[] {
  const byResource = new Map<string, PermItem[]>()

  for (const p of perms) {
    const { resource, action } = splitPermission(p.name)
    const meta = ACTION_LABELS[action]
    const list = byResource.get(resource) ?? []
    list.push({
      id: p.id,
      name: p.name,
      action,
      label: meta?.label ?? titleCase(action),
      hint: meta?.hint ?? "",
    })
    byResource.set(resource, list)
  }

  return [...byResource.entries()]
    .map(([resource, items]) => ({
      resource,
      label: RESOURCE_LABELS[resource] ?? titleCase(resource),
      items: items.sort((a, b) => {
        const ai = ACTION_ORDER.indexOf(a.action)
        const bi = ACTION_ORDER.indexOf(b.action)
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      }),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

// ─── Form schema ──────────────────────────────────────────────────────────────

const roleFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  scope: z.enum(["TENANT", "GLOBAL"]),
  // Permission IDs, so what is ticked is exactly what gets saved.
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

  const [query, setQuery] = useState("")

  const groups = useMemo(() => groupPermissions(permissions), [permissions])

  // Permissions this role already holds that the current user cannot see (a
  // super-admin may have granted global-only ones). They stay on the role
  // instead of being wiped by an edit.
  const hiddenIds = useMemo(() => {
    if (!editTarget?.permissions) return []
    const visible = new Set(permissions.map((p) => p.id))
    return editTarget.permissions.filter((p) => !visible.has(p.id)).map((p) => p.id)
  }, [editTarget, permissions])

  const visibleGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return groups
    return groups
      .map((g) => ({
        ...g,
        items: g.label.toLowerCase().includes(q)
          ? g.items
          : g.items.filter(
              (i) => i.name.toLowerCase().includes(q) || i.label.toLowerCase().includes(q),
            ),
      }))
      .filter((g) => g.items.length > 0)
  }, [groups, query])

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } =
    useForm<RoleFormValues>({
      resolver: zodResolver(roleFormSchema),
      defaultValues: { name: "", scope: "TENANT", permissions: [] },
    })

  const selected = watch("permissions") ?? []

  useEffect(() => {
    setQuery("")
    reset({
      name: editTarget?.name ?? "",
      scope: editTarget?.scope ?? "TENANT",
      permissions: editTarget?.permissions?.map((p) => p.id) ?? [],
    })
  }, [editTarget, open, reset])

  function setSelected(ids: string[]) {
    setValue("permissions", ids, { shouldValidate: true })
  }

  function toggle(id: string) {
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  function toggleGroup(items: PermItem[]) {
    const ids = items.map((i) => i.id)
    const allOn = ids.every((id) => selected.includes(id))
    setSelected(
      allOn
        ? selected.filter((id) => !ids.includes(id))
        : Array.from(new Set([...selected, ...ids])),
    )
  }

  function onSubmit(values: RoleFormValues) {
    const permissionIds = Array.from(new Set([...values.permissions, ...hiddenIds]))

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
      <DialogContent showCloseButton={false} className="sm:max-w-2xl">
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <FieldLabel>What this role can do</FieldLabel>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">
                      {selected.length} selected
                    </span>
                    {selected.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelected([])}
                        className="font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search a page or action, e.g. menu"
                    className="pl-8"
                    aria-label="Search permissions"
                  />
                </div>

                <div className="max-h-[22rem] divide-y overflow-y-auto rounded-lg border">
                  {loadingPermissions ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      Loading permissions…
                    </div>
                  ) : visibleGroups.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      No permission matches “{query}”.
                    </div>
                  ) : (
                    visibleGroups.map((group) => {
                      const ids = group.items.map((i) => i.id)
                      const on = ids.filter((id) => selected.includes(id)).length
                      const allOn = on === ids.length
                      return (
                        <div key={group.resource} className="p-3">
                          <div className="mb-2 flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`grp-${group.resource}`}
                              checked={allOn}
                              ref={(el) => {
                                if (el) el.indeterminate = on > 0 && !allOn
                              }}
                              onChange={() => toggleGroup(group.items)}
                              className="size-4 rounded border-input"
                            />
                            <label
                              htmlFor={`grp-${group.resource}`}
                              className="cursor-pointer text-sm font-semibold"
                            >
                              {group.label}
                            </label>
                            <span className="text-xs text-muted-foreground">
                              {on}/{ids.length}
                            </span>
                          </div>
                          <div className="grid gap-1.5 pl-6 sm:grid-cols-2">
                            {group.items.map((item) => (
                              <label
                                key={item.id}
                                title={item.name}
                                className="flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 hover:bg-muted/50"
                              >
                                <input
                                  type="checkbox"
                                  checked={selected.includes(item.id)}
                                  onChange={() => toggle(item.id)}
                                  className="mt-0.5 size-4 rounded border-input"
                                />
                                <span className="leading-tight">
                                  <span className="block text-sm">{item.label}</span>
                                  {item.hint && (
                                    <span className="block text-xs text-muted-foreground">
                                      {item.hint}
                                    </span>
                                  )}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  “View list” is what lets someone open the page at all. Without it the
                  menu entry stays hidden.
                  {hiddenIds.length > 0 &&
                    ` ${hiddenIds.length} system permission(s) on this role are not shown and will be kept.`}
                </p>
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
