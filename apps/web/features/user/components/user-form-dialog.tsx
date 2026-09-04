"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

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
import { cn } from "@/lib/utils"
import { useRoles } from "@/features/role/hooks/use-roles"

import {
  createUserSchema,
  updateUserSchema,
  type CreateUserValues,
  type UpdateUserValues,
} from "../schemas/user"
import { useCreateUser, useUpdateUser } from "../hooks/use-users"
import type { User } from "../types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  editTarget?: User
  filterTenantId?: string | null
}

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"

export function UserFormDialog({ open, onOpenChange, editTarget, filterTenantId }: Props) {
  const isEdit = !!editTarget
  const { mutate: create, isPending: creating } = useCreateUser(filterTenantId)
  const { mutate: update, isPending: updating } = useUpdateUser()
  const { data: roles = [] } = useRoles(filterTenantId)
  const isPending = creating || updating

  const createForm = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: "", email: "", password: "", roleId: "" },
  })

  const updateForm = useForm<UpdateUserValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { name: "", email: "", roleId: "", password: "" },
  })

  const { register, handleSubmit, reset, formState: { errors } } = isEdit ? updateForm : createForm

  useEffect(() => {
    if (isEdit) {
      updateForm.reset({
        name: editTarget.name,
        email: editTarget.email,
        roleId: editTarget.roleId,
        password: "",
      })
    } else {
      createForm.reset({ name: "", email: "", password: "", roleId: "" })
    }
  }, [editTarget, open])

  function onSubmit(values: CreateUserValues | UpdateUserValues) {
    if (isEdit) {
      const v = values as UpdateUserValues
      update(
        { id: editTarget.id, name: v.name, email: v.email, roleId: v.roleId, password: v.password },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      create(values as CreateUserValues, { onSuccess: () => onOpenChange(false) })
    }
  }

  const scopeBadge = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId)
    if (!role) return null
    return (
      <span className={cn(
        "ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
        role.scope === "GLOBAL"
          ? "bg-purple-100 text-purple-700"
          : "bg-blue-100 text-blue-700",
      )}>
        {role.scope === "GLOBAL" ? "Global" : "Tenant"}
      </span>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "Add User"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit as never)} noValidate>
          <FieldSet disabled={isPending}>
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="user-name">Name</FieldLabel>
                <Input
                  id="user-name"
                  placeholder="e.g. John Doe"
                  aria-invalid={!!errors.name}
                  {...register("name")}
                />
                <FieldError errors={[errors.name]} />
              </Field>

              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="user-email">Email</FieldLabel>
                <Input
                  id="user-email"
                  type="email"
                  placeholder="john@example.com"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                <FieldError errors={[errors.email]} />
              </Field>

              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="user-password">
                  Password
                  {isEdit && (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      (leave blank to keep current)
                    </span>
                  )}
                </FieldLabel>
                <Input
                  id="user-password"
                  type="password"
                  placeholder={isEdit ? "••••••••" : "Min 8 characters"}
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
                <FieldError errors={[errors.password]} />
              </Field>

              <Field data-invalid={!!errors.roleId}>
                <FieldLabel htmlFor="user-role">Role</FieldLabel>
                <div className="space-y-1">
                  <select
                    id="user-role"
                    aria-invalid={!!errors.roleId}
                    className={cn(selectClass, errors.roleId && "border-destructive")}
                    {...register("roleId")}
                  >
                    <option value="">Select a role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name} ({role.scope === "GLOBAL" ? "Global — full access" : "Tenant"})
                      </option>
                    ))}
                  </select>
                  {/* Scope hint */}
                  {(() => {
                    const watchedRoleId = isEdit
                      ? updateForm.watch("roleId")
                      : createForm.watch("roleId")
                    return scopeBadge(watchedRoleId)
                  })()}
                </div>
                <FieldError errors={[errors.roleId]} />
              </Field>
            </FieldGroup>
          </FieldSet>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
