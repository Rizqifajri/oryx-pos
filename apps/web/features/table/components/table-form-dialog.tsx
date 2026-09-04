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

import { createTableSchema, updateTableSchema, type CreateTableValues, type UpdateTableValues } from "../schemas/table"
import { useCreateTable, useUpdateTable } from "../hooks/use-tables"
import type { Table, CreateTableInput, UpdateTableInput } from "../types"
import { getStoredUser } from "@/features/auth/hooks/use-auth"

interface TableFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  table?: Table | null
  filterTenantId?: string | null
}

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"

export function TableFormDialog({ open, onOpenChange, table, filterTenantId }: TableFormDialogProps) {
  const isEdit = !!table
  const user = getStoredUser()
  const tenantId = filterTenantId || user?.tenantId || ""

  const { mutate: createTable, isPending: isCreating } = useCreateTable()
  const { mutate: updateTable, isPending: isUpdating } = useUpdateTable()
  const isPending = isCreating || isUpdating

  const form = useForm<CreateTableValues>({
    resolver: zodResolver(createTableSchema),
    defaultValues: { tenantId, name: "", capacity: 2, status: "AVAILABLE" },
  })

  const { register, handleSubmit, formState: { errors } } = form

  useEffect(() => {
    if (isEdit && table) {
      form.reset({
        tenantId,
        name: table.name,
        capacity: table.capacity,
        status: table.status,
      })
    } else {
      form.reset({ tenantId, name: "", capacity: 2, status: "AVAILABLE" })
    }
  }, [table, open, tenantId, form])

  function onSubmit(values: CreateTableValues) {
    if (isEdit && table) {
      const input: UpdateTableInput = {
        name: values.name,
        capacity: values.capacity,
        status: values.status,
      }
      updateTable(
        { id: table.id, input },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      const input: CreateTableInput = {
        tenantId: values.tenantId,
        name: values.name,
        capacity: values.capacity,
        status: values.status,
      }
      createTable(input, { onSuccess: () => onOpenChange(false) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Table" : "Add Table"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldSet disabled={isPending}>
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="table-name">Table Name</FieldLabel>
                <Input
                  id="table-name"
                  placeholder="e.g. Table 1, VIP Room"
                  aria-invalid={!!errors.name}
                  {...register("name")}
                />
                <FieldError errors={[errors.name]} />
              </Field>

              <Field data-invalid={!!errors.capacity}>
                <FieldLabel htmlFor="table-capacity">Capacity</FieldLabel>
                <Input
                  id="table-capacity"
                  type="number"
                  placeholder="4"
                  aria-invalid={!!errors.capacity}
                  {...register("capacity", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.capacity]} />
              </Field>

              <Field data-invalid={!!errors.status}>
                <FieldLabel htmlFor="table-status">Status</FieldLabel>
                <select
                  id="table-status"
                  aria-invalid={!!errors.status}
                  className={cn(selectClass, errors.status && "border-destructive")}
                  {...register("status")}
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="OCCUPIED">Occupied</option>
                </select>
                <FieldError errors={[errors.status]} />
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
