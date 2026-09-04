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

import { createCategorySchema, type CreateCategoryValues } from "../schemas/category"
import { useCreateCategory, useUpdateCategory } from "../hooks/use-categories"
import type { Category } from "../types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  editTarget?: Category
  filterTenantId?: string | null
}

export function CategoryFormDialog({ open, onOpenChange, editTarget, filterTenantId }: Props) {
  const isEdit = !!editTarget
  const { mutate: create, isPending: creating } = useCreateCategory(filterTenantId)
  const { mutate: update, isPending: updating } = useUpdateCategory()
  const isPending = creating || updating

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCategoryValues>({
    resolver: zodResolver(createCategorySchema),
  })

  useEffect(() => {
    reset({ name: editTarget?.name ?? "" })
  }, [editTarget, open, reset])

  function onSubmit(values: CreateCategoryValues) {
    if (isEdit) {
      update(
        { id: editTarget.id, name: values.name },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      create(values.name, { onSuccess: () => onOpenChange(false) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Category" : "Add Category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldSet disabled={isPending}>
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="cat-name">Name</FieldLabel>
                <Input
                  id="cat-name"
                  placeholder="e.g. Appetizers"
                  aria-invalid={!!errors.name}
                  {...register("name")}
                />
                <FieldError errors={[errors.name]} />
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
