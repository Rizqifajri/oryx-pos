"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PermissionGuard } from "@/components/guards"
import { PERMISSIONS } from "@/constants/permissions"

import { useMenus, useToggleAvailability, useBulkAvailability } from "@/features/menu/hooks/use-menus"
import { useCategories } from "@/features/menu/hooks/use-categories"

function formatPrice(cents: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

interface InventorySectionProps {
  tenantId?: string | null
}

export function InventorySection({ tenantId }: InventorySectionProps) {
  const [filterCategory, setFilterCategory] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Build filters conditionally
  const menuFilters: { tenantId?: string; categoryId?: string } = {}
  if (tenantId) menuFilters.tenantId = tenantId
  if (filterCategory) menuFilters.categoryId = filterCategory

  const categoryFilters: { tenantId?: string } = {}
  if (tenantId) categoryFilters.tenantId = tenantId

  const { data: menus = [], isLoading } = useMenus(
    Object.keys(menuFilters).length > 0 ? menuFilters : undefined,
  )
  const { data: categories = [] } = useCategories(
    Object.keys(categoryFilters).length > 0 ? categoryFilters : undefined,
  )
  const { mutate: toggle, isPending: toggling } = useToggleAvailability()
  const { mutate: bulk, isPending: bulking } = useBulkAvailability()

  const allIds = menus.map((m) => m.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id))
  const someSelected = selected.size > 0

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allIds))
    }
  }

  function bulkSet(isAvailable: boolean) {
    const menuIds = Array.from(selected)
    bulk(
      { menuIds, isAvailable },
      { onSuccess: () => setSelected(new Set()) },
    )
  }

  function categoryName(id: string) {
    return categories.find((c) => c.id === id)?.name ?? "—"
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <select
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value)
            setSelected(new Set())
          }}
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {someSelected && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">
              {selected.size} selected
            </span>
            <PermissionGuard permissions={PERMISSIONS.MENU_UPDATE}>
              <Button
                size="sm"
                variant="outline"
                disabled={bulking}
                onClick={() => bulkSet(true)}
                className="text-green-700 border-green-600/40 hover:bg-green-50"
              >
                Mark Available
              </Button>
            </PermissionGuard>
            <PermissionGuard permissions={PERMISSIONS.MENU_UPDATE}>
              <Button
                size="sm"
                variant="outline"
                disabled={bulking}
                onClick={() => bulkSet(false)}
                className="text-red-700 border-red-600/40 hover:bg-red-50"
              >
                Mark Unavailable
              </Button>
            </PermissionGuard>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={isLoading || menus.length === 0}
                  className="size-4 rounded border-input"
                  aria-label="Select all"
                />
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Item</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Category</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Price</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Stock</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-3"><Skeleton className="size-4 rounded" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3 text-right"><Skeleton className="ml-auto h-4 w-20" /></td>
                  <td className="px-4 py-3 text-center"><Skeleton className="mx-auto h-6 w-24 rounded-full" /></td>
                </tr>
              ))}

            {!isLoading && menus.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  No menu items found.
                </td>
              </tr>
            )}

            {menus.map((menu) => (
              <tr
                key={menu.id}
                className={cn(
                  "border-b last:border-0 transition-colors",
                  selected.has(menu.id) ? "bg-muted/40" : "hover:bg-muted/20",
                )}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(menu.id)}
                    onChange={() => toggleRow(menu.id)}
                    className="size-4 rounded border-input"
                    aria-label={`Select ${menu.name}`}
                  />
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
                  <PermissionGuard permissions={PERMISSIONS.MENU_UPDATE}>
                    <button
                      disabled={toggling}
                      onClick={() => toggle({ id: menu.id, isAvailable: !menu.isAvailable })}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors disabled:opacity-50",
                        menu.isAvailable
                          ? "bg-green-50 text-green-700 ring-green-600/20 hover:bg-green-100"
                          : "bg-red-50 text-red-700 ring-red-600/20 hover:bg-red-100",
                      )}
                    >
                      <span className={cn(
                        "size-1.5 rounded-full",
                        menu.isAvailable ? "bg-green-500" : "bg-red-500",
                      )} />
                      {menu.isAvailable ? "In Stock" : "Out of Stock"}
                    </button>
                  </PermissionGuard>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isLoading && menus.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {menus.filter((m) => m.isAvailable).length} of {menus.length} items in stock
        </p>
      )}
    </div>
  )
}
