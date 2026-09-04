"use client"

import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmationModal } from "@/components/confirmation-modals"
import { PermissionGuard } from "@/components/guards"
import { PERMISSIONS } from "@/constants/permissions"

import { useCategories, useDeleteCategory } from "../hooks/use-categories"
import { CategoryFormDialog } from "./category-form-dialog"
import type { Category } from "../types"

interface CategorySectionProps {
  tenantId?: string | null
}

export function CategorySection({ tenantId }: CategorySectionProps = {}) {
  const { data: categories = [], isLoading } = useCategories(
    tenantId ? { tenantId } : undefined
  )
  const { mutate: deleteCategory, isPending: deleting } = useDeleteCategory()

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Category | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  function openAdd() {
    setEditTarget(undefined)
    setFormOpen(true)
  }

  function openEdit(category: Category) {
    setEditTarget(category)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Categories</h2>
        <PermissionGuard permissions={PERMISSIONS.CATEGORY_CREATE}>
          <Button size="sm" onClick={openAdd}>
            <Plus />
            Add Category
          </Button>
        </PermissionGuard>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3 text-right"><Skeleton className="ml-auto h-7 w-20" /></td>
                </tr>
              ))}

            {!isLoading && categories.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">
                  No categories yet. Add one to get started.
                </td>
              </tr>
            )}

            {categories.map((category) => (
              <tr key={category.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{category.name}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <PermissionGuard permissions={PERMISSIONS.CATEGORY_UPDATE}>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => openEdit(category)}
                      >
                        <Pencil />
                        <span className="sr-only">Edit</span>
                      </Button>
                    </PermissionGuard>
                    <PermissionGuard permissions={PERMISSIONS.CATEGORY_DELETE}>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(category.id)}
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

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editTarget={editTarget}
        filterTenantId={tenantId}
      />

      <ConfirmationModal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete category"
        description="This will permanently delete the category. Menu items in this category may be affected."
        confirmLabel="Delete"
        isPending={deleting}
        onConfirm={() => {
          if (deleteTarget) {
            deleteCategory(deleteTarget, { onSuccess: () => setDeleteTarget(null) })
          }
        }}
      />
    </div>
  )
}
