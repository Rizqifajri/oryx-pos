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

import { createTenantSchema, type CreateTenantValues } from "../schemas/tenant"
import { useCreateTenant, useUpdateTenant } from "../hooks/use-tenants"
import type { Tenant } from "../types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  editTarget?: Tenant
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
}

export function TenantFormDialog({ open, onOpenChange, editTarget }: Props) {
  const isEdit = !!editTarget
  const { mutate: create, isPending: creating } = useCreateTenant()
  const { mutate: update, isPending: updating } = useUpdateTenant()
  const isPending = creating || updating

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateTenantValues>({
    resolver: zodResolver(createTenantSchema),
  })

  useEffect(() => {
    reset({
      name: editTarget?.name ?? "",
      slug: editTarget?.slug ?? "",
    })
  }, [editTarget, open, reset])

  const nameValue = watch("name")
  useEffect(() => {
    if (!isEdit && nameValue) {
      setValue("slug", toSlug(nameValue), { shouldValidate: false })
    }
  }, [nameValue, isEdit, setValue])

  function onSubmit(values: CreateTenantValues) {
    if (isEdit) {
      update(
        { id: editTarget.id, name: values.name, slug: values.slug },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      create(
        { name: values.name, slug: values.slug },
        { onSuccess: () => onOpenChange(false) },
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Tenant" : "Add Tenant"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldSet disabled={isPending}>
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="tenant-name">Name</FieldLabel>
                <Input
                  id="tenant-name"
                  placeholder="e.g. Warung Nusantara"
                  aria-invalid={!!errors.name}
                  {...register("name")}
                />
                <FieldError errors={[errors.name]} />
              </Field>

              <Field data-invalid={!!errors.slug}>
                <FieldLabel htmlFor="tenant-slug">Slug</FieldLabel>
                <Input
                  id="tenant-slug"
                  placeholder="e.g. warung-nusantara"
                  aria-invalid={!!errors.slug}
                  {...register("slug")}
                />
                <FieldError errors={[errors.slug]} />
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
