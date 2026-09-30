"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Clock, ReceiptText, RefreshCw } from "lucide-react"
import { useMenu, useSessionView } from "../hooks"
import { useGuest } from "../session-context"
import type { MenuItem } from "../types"
import { CartBar, TAB_AND_CART_SPACE } from "../components/bottom-bars"
import { GuestSheet } from "../components/guest-sheet"
import { HelpSheet } from "../components/help-actions"
import { ItemDetailSheet } from "../components/item-detail-sheet"
import {
  CategoryRail,
  DEFAULT_FILTERS,
  FilterSheet,
  type MenuFilters,
  MenuSearch,
  type RailEntry,
  SectionHeader,
} from "../components/menu-browse"
import { MenuItemCard, MenuItemCardSkeleton } from "../components/menu-item-card"
import { MenuHeader, RestaurantCard } from "../components/menu-header"
import { categoryIcon, PopularIcon } from "../components/primitives"
import { cn } from "@/lib/utils"

type Section = { id: string; title: string; icon: RailEntry["icon"]; items: MenuItem[] }

const POPULAR_ID = "populer"

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** Buku Menu — the scanned-QR landing page. */
export function MenuPage() {
  const { guest, basePath } = useGuest()
  const { data: menu, isLoading, isError, refetch } = useMenu()
  const { data: view } = useSessionView()

  const [query, setQuery] = useState("")
  const q = useDebounced(query.trim().toLowerCase(), 250)
  const [filters, setFilters] = useState<MenuFilters>(DEFAULT_FILTERS)
  const [detail, setDetail] = useState<MenuItem | null>(null)
  const [sheet, setSheet] = useState<"help" | "guest" | "filter" | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const tenantOpen = view?.tenant?.isOpen ?? guest.tenant.isOpen
  const sessionStatus = view?.session.status ?? "open"
  const canOrder = tenantOpen && sessionStatus === "open"

  const sections = useMemo<Section[]>(() => {
    if (!menu) return []
    const categoryName = new Map(menu.categories.map((c) => [c.id, c.name]))
    let items = menu.items
    if (filters.hideSoldOut) items = items.filter((i) => i.isAvailable)

    const sort = (list: MenuItem[]) => {
      const sorted = [...list]
      if (filters.sort === "price_asc") sorted.sort((a, b) => a.price - b.price)
      else if (filters.sort === "price_desc") sorted.sort((a, b) => b.price - a.price)
      else sorted.sort((a, b) => Number(b.isPopular) - Number(a.isPopular))
      // Sold-out items sink to the bottom of each section.
      return sorted.sort((a, b) => Number(b.isAvailable) - Number(a.isAvailable))
    }

    if (q) {
      const hits = items.filter((i) =>
        `${i.name} ${i.description} ${categoryName.get(i.categoryId) ?? ""}`.toLowerCase().includes(q),
      )
      return [{ id: "hasil", title: `Hasil untuk “${q}”`, icon: PopularIcon, items: sort(hits) }]
    }

    const result: Section[] = []
    const popular = items.filter((i) => i.isPopular)
    if (popular.length > 0) {
      result.push({ id: POPULAR_ID, title: "Pilihan Populer", icon: PopularIcon, items: sort(popular) })
    }
    for (const category of menu.categories) {
      result.push({
        id: category.id,
        title: category.name,
        icon: categoryIcon(category.name),
        items: sort(items.filter((i) => i.categoryId === category.id)),
      })
    }
    return result
  }, [menu, filters, q])

  const hasPopular = sections.some((s) => s.id === POPULAR_ID)

  // Scroll-spy: the section nearest the top of the viewport drives the rail.
  useEffect(() => {
    if (q || sections.length === 0) return
    const visible = new Map<string, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.sectionId!
          if (entry.isIntersecting) visible.set(id, entry.boundingClientRect.top)
          else visible.delete(id)
        }
        const top = [...visible.entries()].sort((a, b) => a[1] - b[1])[0]
        if (top) setActiveId(top[0])
      },
      { rootMargin: "-80px 0px -55% 0px" },
    )
    document.querySelectorAll<HTMLElement>("[data-section-id]").forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [q, sections])

  function scrollToSection(id: string) {
    setActiveId(id)
    document
      .getElementById(`section-${id}`)
      ?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" })
  }

  function focusSearch() {
    searchRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" })
    searchRef.current?.focus({ preventScroll: true })
  }

  const railEntries: RailEntry[] = q
    ? []
    : sections.map(({ id, title, icon }) => ({ id, label: id === POPULAR_ID ? "Populer" : title, icon }))
  const filterActive = filters.sort !== DEFAULT_FILTERS.sort || filters.hideSoldOut

  return (
    <>
      <MenuHeader
        onCallWaiter={() => setSheet("help")}
        onSearch={focusSearch}
        onProfile={() => setSheet("guest")}
      />

      <main className={cn("mx-auto max-w-[1120px] space-y-3 px-3 pt-1 sm:px-4", TAB_AND_CART_SPACE)}>
        <RestaurantCard />

        {!tenantOpen && (
          <Banner icon={<Clock className="size-4" aria-hidden />}>
            Dapur sedang tutup. Menu tetap bisa dilihat, tetapi pesanan belum bisa dikirim.
          </Banner>
        )}
        {sessionStatus === "billing" && (
          <Banner icon={<ReceiptText className="size-4" aria-hidden />}>
            Tagihan meja sedang dibayar, jadi pesanan baru dijeda.{" "}
            <Link href={`${basePath}/bill`} className="font-bold underline underline-offset-2">
              Lihat tagihan
            </Link>
          </Banner>
        )}

        <MenuSearch
          ref={searchRef}
          value={query}
          onChange={setQuery}
          onFilter={() => setSheet("filter")}
          filterActive={filterActive}
        />

        {isError ? (
          <div className="rounded-[14px] bg-pm-surface p-6 text-center shadow-pm-card">
            <p className="text-[13px] text-pm-muted">Menu gagal dimuat.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-pm-ink px-4 text-[12px] font-bold text-white"
            >
              <RefreshCw className="size-3.5" aria-hidden /> Coba lagi
            </button>
          </div>
        ) : (
          <div className="flex gap-3 lg:gap-4">
            {!q && (
              <div className="w-12 shrink-0 sm:w-14 lg:w-[180px]">
                {isLoading ? (
                  <div className="space-y-1.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-12 animate-pulse rounded-[8px] bg-pm-surface" />
                    ))}
                  </div>
                ) : (
                  <CategoryRail entries={railEntries} activeId={activeId ?? railEntries[0]?.id ?? null} onSelect={scrollToSection} />
                )}
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-6">
              {isLoading && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <MenuItemCardSkeleton key={i} />
                  ))}
                </div>
              )}

              {!isLoading && sections.length === 0 && (
                <p className="py-12 text-center text-[13px] text-pm-muted">Belum ada menu yang tersedia.</p>
              )}

              {sections.map((section) => (
                <section
                  key={section.id}
                  id={`section-${section.id}`}
                  data-section-id={section.id}
                  aria-labelledby={`heading-${section.id}`}
                  className="scroll-mt-[76px]"
                >
                  <SectionHeader
                    id={`heading-${section.id}`}
                    title={section.title}
                    count={section.items.length}
                    onRecommend={
                      hasPopular && section.id !== POPULAR_ID && !q
                        ? () => scrollToSection(POPULAR_ID)
                        : undefined
                    }
                  />
                  {section.items.length === 0 ? (
                    q ? (
                      <div className="rounded-[14px] bg-pm-surface p-6 text-center shadow-pm-card">
                        <p className="text-[13px] leading-[19px] text-pm-muted">
                          Menu “{q}” tidak ditemukan. Coba kata lain atau lihat kategori.
                        </p>
                        <button
                          type="button"
                          onClick={() => setQuery("")}
                          className="mt-3 h-10 rounded-full bg-pm-ink px-4 text-[12px] font-bold text-white"
                        >
                          Hapus pencarian
                        </button>
                      </div>
                    ) : (
                      <p className="rounded-[14px] bg-pm-surface p-4 text-[13px] text-pm-muted">
                        Belum ada menu di kategori ini.
                      </p>
                    )
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {section.items.map((item) => (
                        <MenuItemCard key={item.id} item={item} canOrder={canOrder} onOpen={setDetail} />
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </div>
        )}
      </main>

      <CartBar />
      <ItemDetailSheet item={detail} canOrder={canOrder} onOpenChange={(open) => !open && setDetail(null)} />
      <HelpSheet open={sheet === "help"} onOpenChange={(open) => setSheet(open ? "help" : null)} />
      <GuestSheet open={sheet === "guest"} onOpenChange={(open) => setSheet(open ? "guest" : null)} />
      <FilterSheet
        open={sheet === "filter"}
        onOpenChange={(open) => setSheet(open ? "filter" : null)}
        filters={filters}
        onChange={setFilters}
      />
    </>
  )
}

export function Banner({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div role="status" className="flex items-start gap-2 rounded-[12px] bg-pm-amber-bg px-3 py-2.5 text-[12px] leading-[17px] text-pm-amber-fg">
      <span className="mt-px shrink-0">{icon}</span>
      <p>{children}</p>
    </div>
  )
}
