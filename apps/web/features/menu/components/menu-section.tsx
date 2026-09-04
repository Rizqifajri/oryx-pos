"use client"

import { useState } from "react"
// Tambahkan import ImageIcon untuk fallback gambar kosong
import { Pencil, Plus, Trash2, Image as ImageIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmationModal } from "@/components/confirmation-modals"
import { SearchBar } from "@/components/search-bar"
import { PermissionGuard } from "@/components/guards"
import { PERMISSIONS } from "@/constants/permissions"
import { cn } from "@/lib/utils"

import { useMenus, useDeleteMenu, useToggleAvailability } from "../hooks/use-menus"
import { useCategories } from "../hooks/use-categories"
import { MenuFormDialog } from "./menu-form-dialog"
import type { Menu } from "../types"

interface MenuSectionProps {
  tenantId?: string | null
}

export function MenuSection({ tenantId }: MenuSectionProps = {}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState("")

  // Build filters object conditionally
  const menuFilters = {
    ...(tenantId ? { tenantId } : {}),
    ...(filterCategory ? { categoryId: filterCategory } : {}),
  }
  const hasFilters = Object.keys(menuFilters).length > 0

  const { data: menus = [], isLoading } = useMenus(hasFilters ? menuFilters : undefined)
  const { data: categories = [] } = useCategories(tenantId ? { tenantId } : undefined)
  const { mutate: deleteMenu, isPending: deleting } = useDeleteMenu()
  const { mutate: toggle } = useToggleAvailability()

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Menu | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  function openAdd() {
    setEditTarget(undefined)
    setFormOpen(true)
  }

  function openEdit(menu: Menu) {
    setEditTarget(menu)
    setFormOpen(true)
  }

  function categoryName(id: string) {
    return categories.find((c) => c.id === id)?.name ?? "—"
  }

  function formatPrice(cents: number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  const filteredMenus = menus.filter((menu) => {
    if (!searchQuery) return true;
    return menu.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 w-full sm:w-auto">
          <SearchBar
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 mb-[1px]"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <PermissionGuard permissions={PERMISSIONS.MENU_CREATE}>
          <Button size="sm" onClick={openAdd} className="mb-[1px]">
            <Plus className="mr-2 h-4 w-4" />
            Add Menu Item
          </Button>
        </PermissionGuard>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {/* 1. Tambah Header Image */}
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-16">Image</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Category</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Price</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Available</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  {/* 2. Tambah Skeleton untuk Image */}
                  <td className="px-4 py-3"><Skeleton className="h-10 w-10 rounded-md" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3 text-right"><Skeleton className="ml-auto h-4 w-16" /></td>
                  <td className="px-4 py-3 text-center"><Skeleton className="mx-auto h-5 w-12 rounded-full" /></td>
                  <td className="px-4 py-3 text-right"><Skeleton className="ml-auto h-7 w-16" /></td>
                </tr>
              ))}

            {!isLoading && filteredMenus.length === 0 && (
              <tr>
                {/* 3. Ubah colSpan dari 5 menjadi 6 */}
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  {searchQuery ? "No menu items match your search." : "No menu items yet. Add one to get started."}
                </td>
              </tr>
            )}

            {filteredMenus.map((menu) => (
              <tr key={menu.id} className="border-b last:border-0 hover:bg-muted/30">
                {/* 4. Render Image dengan fallback */}
                <td className="px-4 py-3">
                  {menu.imageUrl ? (
                    <img
                      src={menu.imageUrl}
                      alt={menu.name}
                      className="h-10 w-10 rounded-md object-cover border bg-muted"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center border">
                      <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{menu.name}</p>
                  {menu.description && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground max-w-48">
                      {menu.description}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {categoryName(menu.categoryId)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatPrice(menu.price)}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() =>
                      toggle({ id: menu.id, isAvailable: !menu.isAvailable })
                    }
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors",
                      menu.isAvailable
                        ? "bg-green-50 text-green-700 ring-green-600/20 hover:bg-green-100"
                        : "bg-red-50 text-red-700 ring-red-600/20 hover:bg-red-100",
                    )}
                  >
                    {menu.isAvailable ? "Available" : "Unavailable"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <PermissionGuard permissions={PERMISSIONS.MENU_UPDATE}>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => openEdit(menu)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                    </PermissionGuard>
                    <PermissionGuard permissions={PERMISSIONS.MENU_DELETE}>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(menu.id)}
                      >
                        <Trash2 className="h-4 w-4" />
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

      <MenuFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editTarget={editTarget}
        filterTenantId={tenantId}
      />

      <ConfirmationModal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete menu item"
        description="This will permanently delete the menu item."
        confirmLabel="Delete"
        isPending={deleting}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMenu(deleteTarget, { onSuccess: () => setDeleteTarget(null) })
          }
        }}
      />
    </div>
  )
}