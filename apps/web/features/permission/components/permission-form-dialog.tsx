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

import { createPermissionSchema, type CreatePermissionValues } from "../schemas/permission"
import { useCreatePermission, useUpdatePermission } from "../hooks/use-permissions"
import type { Permission } from "../types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  editTarget?: Permission
}

export function PermissionFormDialog({ open, onOpenChange, editTarget }: Props) {
  const isEdit = !!editTarget
  const { mutate: create, isPending: creating } = useCreatePermission()
  const { mutate: update, isPending: updating } = useUpdatePermission()
  const isPending = creating || updating

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePermissionValues>({
    resolver: zodResolver(createPermissionSchema),
  })

  useEffect(() => {
    reset({
      name: editTarget?.name ?? "",
    })
  }, [editTarget, open, reset])

  function onSubmit(values: CreatePermissionValues) {
    if (isEdit) {
      update(
        { id: editTarget.id, name: values.name },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      create(
        { name: values.name },
        { onSuccess: () => onOpenChange(false) },
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Permission" : "Add Permission"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldSet disabled={isPending}>
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="permission-name">Permission Name</FieldLabel>
                <Input
                  id="permission-name"
                  placeholder="e.g. user:read"
                  aria-invalid={!!errors.name}
                  {...register("name")}
                />
                <FieldError errors={[errors.name]} />
                <p className="mt-1 text-xs text-muted-foreground">
                  Format: resource:action (e.g., user:read, order:create)
                </p>
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
