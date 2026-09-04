"use client"

import { useState } from "react"
import { useCategories } from "@/features/menu/hooks/use-categories"
import { useMenusByTenant } from "@/features/menu/hooks/use-menus"
import { MenuItemCard } from "./menu-item-card"

interface Props {
  tenantId: string
}

export function MenuView({ tenantId }: Props) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)

  const { data: allMenus = [], isLoading } = useMenusByTenant(tenantId, { isAvailable: true })
  const { data: categories = [] } = useCategories()

  const filtered = activeCategoryId
    ? allMenus.filter((m) => m.categoryId === activeCategoryId)
    : allMenus

  const tenantCategories = categories.filter((c) =>
    allMenus.some((m) => m.categoryId === c.id),
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setActiveCategoryId(null)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeCategoryId === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          All
        </button>
        {tenantCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategoryId(cat.id)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeCategoryId === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-4/5 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          No menu items available.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map((menu) => (
            <MenuItemCard key={menu.id} menu={menu} />
          ))}
        </div>
      )}
    </div>
  )
}
