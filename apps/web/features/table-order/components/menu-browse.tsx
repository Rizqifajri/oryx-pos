"use client"

import { forwardRef } from "react"
import { Search, SlidersHorizontal, Sparkles, X, type LucideIcon } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

/** C. Search input with the filter button. */
export const MenuSearch = forwardRef<
  HTMLInputElement,
  { value: string; onChange: (value: string) => void; onFilter: () => void; filterActive: boolean }
>(function MenuSearch({ value, onChange, onFilter, filterActive }, ref) {
  return (
    <div className="flex h-10 items-center gap-2 rounded-[12px] bg-pm-surface-muted pr-1 pl-3">
      <Search className="size-[14px] shrink-0 text-pm-muted" strokeWidth={1.75} aria-hidden />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Cari makanan favorit, kopi, atau dessert…"
        aria-label="Cari menu"
        enterKeyHint="search"
        className="h-full min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-pm-subtle [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Hapus pencarian"
          onClick={() => onChange("")}
          className="grid size-8 place-items-center text-pm-muted"
        >
          <X className="size-[14px]" aria-hidden />
        </button>
      )}
      <button
        type="button"
        aria-label="Filter dan urutkan"
        onClick={onFilter}
        className="relative grid size-8 place-items-center rounded-[8px] text-pm-ink"
      >
        <SlidersHorizontal className="size-[16px]" strokeWidth={1.75} aria-hidden />
        {filterActive && <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-pm-accent" />}
      </button>
    </div>
  )
})

export type RailEntry = { id: string; label: string; icon: LucideIcon }

/**
 * D. Vertical category rail, sticky under the header. Square tiles on mobile
 * and tablet, an icon + label list on desktop. Scrolls itself when long.
 */
export function CategoryRail({
  entries,
  activeId,
  onSelect,
}: {
  entries: RailEntry[]
  activeId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <nav
      aria-label="Kategori menu"
      className="pm-no-scrollbar sticky top-[calc(56px+12px+env(safe-area-inset-top))] max-h-[calc(100dvh-56px-56px-120px)] self-start overflow-y-auto"
    >
      <ul className="flex flex-col gap-1.5">
        {entries.map((entry) => {
          const active = entry.id === activeId
          const Icon = entry.icon
          return (
            <li key={entry.id}>
              <button
                type="button"
                aria-current={active ? "true" : undefined}
                onClick={() => onSelect(entry.id)}
                className={cn(
                  "flex w-12 flex-col items-center justify-center gap-1 rounded-[8px] py-2 sm:w-14 lg:w-full lg:flex-row lg:justify-start lg:gap-2.5 lg:px-3",
                  active ? "bg-pm-ink font-semibold text-white" : "bg-pm-surface text-pm-muted",
                )}
              >
                <Icon className="size-[16px] shrink-0" strokeWidth={1.75} aria-hidden />
                <span className="w-full truncate px-0.5 text-center text-[10px] leading-[13px] lg:px-0 lg:text-left lg:text-[13px] lg:leading-[18px]">
                  {entry.label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** E. Section title + count pill + optional "Rekomendasi" link, on one line. */
export function SectionHeader({
  id,
  title,
  count,
  onRecommend,
}: {
  id: string
  title: string
  count: number
  onRecommend?: () => void
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <h2 id={id} className="truncate text-[18px] leading-[22px] font-bold whitespace-nowrap sm:text-[16px]">
        {title}
      </h2>
      <span className="shrink-0 rounded-full bg-pm-surface-muted px-2 py-0.5 text-[10px] leading-[12px] font-semibold whitespace-nowrap tabular-nums">
        {count} Menu
      </span>
      {onRecommend && (
        <button
          type="button"
          onClick={onRecommend}
          className="ml-auto inline-flex shrink-0 items-center gap-1 text-[12px] leading-[16px] font-bold text-pm-accent"
        >
          <Sparkles className="size-[14px]" strokeWidth={1.75} aria-hidden />
          <span className="max-[399px]:sr-only">Rekomendasi</span>
        </button>
      )}
    </div>
  )
}

export type MenuSort = "popular" | "price_asc" | "price_desc"
export type MenuFilters = { sort: MenuSort; hideSoldOut: boolean }
export const DEFAULT_FILTERS: MenuFilters = { sort: "popular", hideSoldOut: false }

const SORTS: { value: MenuSort; label: string }[] = [
  { value: "popular", label: "Populer" },
  { value: "price_asc", label: "Harga terendah" },
  { value: "price_desc", label: "Harga tertinggi" },
]

/** Sort + availability filter. */
export function FilterSheet({
  open,
  onOpenChange,
  filters,
  onChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: MenuFilters
  onChange: (filters: MenuFilters) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="public-menu mx-auto gap-0 rounded-t-[20px] border-pm-line bg-pm-surface p-4 pb-[calc(16px+env(safe-area-inset-bottom))] sm:bottom-6 sm:max-w-[520px] sm:rounded-[20px]"
      >
        <SheetTitle className="text-[16px] font-bold text-pm-ink">Filter & urutkan</SheetTitle>
        <SheetDescription className="text-[12px] text-pm-muted">
          Atur cara menu ditampilkan.
        </SheetDescription>

        <fieldset className="mt-4">
          <legend className="text-[12px] font-semibold">Urutkan</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {SORTS.map((s) => (
              <button
                key={s.value}
                type="button"
                aria-pressed={filters.sort === s.value}
                onClick={() => onChange({ ...filters, sort: s.value })}
                className={cn(
                  "h-9 rounded-full px-4 text-[12px] font-semibold",
                  filters.sort === s.value ? "bg-pm-ink text-white" : "bg-pm-surface-muted text-pm-ink",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mt-5 flex items-center justify-between gap-3">
          <span className="text-[13px] font-semibold">Sembunyikan menu yang habis</span>
          <input
            type="checkbox"
            checked={filters.hideSoldOut}
            onChange={(e) => onChange({ ...filters, hideSoldOut: e.target.checked })}
            className="size-5 accent-pm-ink"
          />
        </label>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="h-11 flex-1 rounded-full bg-pm-surface-muted text-[13px] font-bold"
          >
            Atur ulang
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-11 flex-1 rounded-full bg-pm-ink text-[13px] font-bold text-white"
          >
            Terapkan
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
