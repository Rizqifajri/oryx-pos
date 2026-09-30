# Public Table Menu — Design Reference

> Source: Google Stitch preview "Maison Table / Table Menu" (mobile, tablet, desktop frames).
> Target: `apps/web` (Next.js 16 App Router, React 19, Tailwind, shadcn/ui on Radix, TanStack Query + Axios, Sonner).
> Scope: the **public, unauthenticated** customer menu that opens when a guest scans the QR code on a table.

---

## 1. Product context

| Item | Value |
|---|---|
| User | Dine-in guest seated at a table, on their own phone (primary), sometimes a table-mounted tablet |
| Entry | QR code on the table → URL containing tenant + table token |
| Primary job | Browse menu → add items → review order → send to kitchen → see table bill |
| Language | Bahasa Indonesia UI, menu item names/descriptions may be English |
| Currency | IDR, formatted `Rp 78.000` (dot thousands separator, no decimals) |
| Auth | None. Session is bound to the table token (guest session) |

Design direction: **warm, quiet, café-premium**. Cream canvas, white cards, near-black primary actions, large food photography as the hero of each card. Color is used sparingly: one amber pill for table number, one olive/gold accent for "recommended/verified", one green dot for "live/open".

---

## 2. Screen anatomy

```
┌──────────────────────────────────────────────┐
│ [logo] MAISON TABLE          (🛎) (🔍) (●)   │  ← A. App header (sticky)
│        Table Menu [Meja 12]                  │
├──────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐ │
│ │ [ic] MAISON ATELIER BISTRO ✓   [• Meja 14]│ │  ← B. Restaurant card
│ │      Artisan Coffee, Kitchen…  Dine-in•QR │ │
│ └──────────────────────────────────────────┘ │
│ [🔍 Cari makanan favorit, kopi, atau…   ⚙]   │  ← C. Search bar
├──────┬───────────────────────────────────────┤
│[Pop] │ Pilihan Populer [5 Menu]  ✦Rekomendasi│  ← E. Section header
│ Mkn  │ ┌───────────────────────────────────┐ │
│ Kopi │ │ [Chef's Pick]                     │ │
│ Segar│ │          food photo               │ │  ← F. Menu item card
│ Dess │ ├───────────────────────────────────┤ │
│ Cml  │ │ Truffle Cream Fettuccine          │ │
│      │ │ Handmade fettuccine with wild…    │ │
│      │ │ Rp 78.000              [+ Tambah] │ │
│  D.  │ └───────────────────────────────────┘ │
│ rail │ ┌───────────────────────────────────┐ │
│      │ │ [Best Seller]  …                  │ │
├──────┴───────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐ │
│ │ (2) Total Pesanan        [Lihat Pesanan →]│ │  ← G. Floating cart bar
│ │     Rp 85.000                             │ │
│ └──────────────────────────────────────────┘ │
│  ✕Buku Menu     🧾Tagihan Meja    🎧Bantuan  │  ← H. Bottom tab bar
└──────────────────────────────────────────────┘
```

Scroll model: the page body scrolls; **A** sticks to the top, **G + H** stick to the bottom, **D** (category rail) is `position: sticky` below A so it stays visible while the item list scrolls.

---

## 3. Design tokens

Values are sampled from the screenshots and rounded to a clean system. Treat them as the source of truth unless the Stitch export gives exact hex values.

### 3.1 Color

| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#F6F4EF` | Page canvas (warm cream) |
| `--surface` | `#FFFFFF` | Cards, restaurant card, rail tiles |
| `--surface-muted` | `#EFECE5` | Search input fill, icon buttons, count pill, active tab pill |
| `--ink` | `#141414` | Primary text, primary buttons, active rail tile, cart bar |
| `--ink-inverse` | `#FFFFFF` | Text on `--ink` |
| `--text-muted` | `#6F6B64` | Descriptions, captions, inactive labels |
| `--text-subtle` | `#A19C93` | Placeholder, disabled |
| `--border` | `#E7E3DB` | Hairline card borders / dividers |
| `--amber-bg` | `#F6E3A8` | Table-number pill in header ("Meja 12") |
| `--amber-fg` | `#7A5B12` | Text on amber pill |
| `--accent` | `#8C7A3B` | "✦ Rekomendasi" link, verified badge (olive-gold) |
| `--success` | `#3DA35D` | Live dot in "• Meja 14" chip |
| `--badge-bg` | `rgba(255,255,255,0.85)` | Image badges ("Chef's Pick", "Best Seller") with backdrop blur |
| `--badge-best` | `#4E7A55` | "Best Seller" badge text (muted green) |
| `--danger` | `#C2412D` | Errors, "Habis" (sold out) — not in mock, reserved |

Dark mode: **not designed**. Ship light-only for the public menu (`forcedTheme="light"` on this route group) until a dark spec exists.

### 3.2 Typography

The mock uses a geometric/humanist sans. Recommended: **Plus Jakarta Sans** (via `next/font/google`), fallback `ui-sans-serif, system-ui, sans-serif`.

| Token | Size / line-height | Weight | Usage |
|---|---|---|---|
| `overline` | 10 / 12, tracking +0.08em, uppercase | 600 | "MAISON TABLE" |
| `title-app` | 16 / 20 | 700 | "Table Menu" |
| `title-brand` | 15 / 20, uppercase, tracking +0.01em | 800 | "MAISON ATELIER BISTRO" |
| `title-section` | 16 / 22 (mobile 18/22) | 700 | "Pilihan Populer" |
| `title-item` | 15 / 20 (tablet+ 16/22) | 700 | "Truffle Cream Fettuccine" |
| `price` | 15 / 20, tabular-nums | 800 | "Rp 78.000" |
| `price-lg` | 16 / 20, tabular-nums | 800 | Cart bar total |
| `body-sm` | 12 / 17 | 400 | Item description, restaurant tagline |
| `caption` | 10 / 13 | 500 | Rail labels, "Dine-in • QR Order", "Total Pesanan", tab labels |
| `badge` | 10 / 12 | 600 | "Chef's Pick", "5 Menu", "Meja 12" |
| `button` | 12 / 16 | 700 | "+ Tambah", "Lihat Pesanan" |

Always use `font-variant-numeric: tabular-nums` for prices and counts.

### 3.3 Spacing, radius, elevation

| Token | Value | Notes |
|---|---|---|
| Base unit | 4px | |
| Page gutter | 12px mobile · 16px tablet · 16px desktop | |
| Card padding | 12px (mobile) · 12–14px (tablet+) | |
| Stack gap (items) | 12px | Between menu cards |
| Rail width | 48px mobile · 44px tablet/desktop | Tiles are square-ish |
| Rail tile gap | 6px | |
| `--radius-sm` | 8px | Rail tiles, icon tiles |
| `--radius-md` | 12px | Search input, restaurant card |
| `--radius-lg` | 14px | Menu item card, image top corners |
| `--radius-full` | 9999px | Pills, icon buttons, CTA buttons, cart bar |
| Shadow card | `0 1px 2px rgba(20,20,20,0.04)` | Nearly flat; rely on white-on-cream contrast |
| Shadow cart bar | `0 8px 24px rgba(20,20,20,0.18)` | Only floating element with real elevation |
| Touch target | ≥ 44×44px | Icon buttons visually 32px → pad hit area |

### 3.4 Iconography

Line icons, 1.75px stroke, 16px (rail/header 18px). Use `lucide-react`:

| Place | Mock icon | Lucide |
|---|---|---|
| Brand / header logo | cloche | `ConciergeBell` |
| Call waiter (header) | cloche/bell | `BellRing` |
| Search | magnifier | `Search` |
| Profile / session | person | `User` (filled black circle container) |
| Filter | sliders | `SlidersHorizontal` |
| Populer | flame | `Flame` |
| Makanan | rice bowl | `Soup` |
| Kopi | cup | `Coffee` |
| Segar | cocktail | `Martini` / `GlassWater` |
| Dessert | cake | `CakeSlice` |
| Camilan | cookie | `Cookie` |
| Rekomendasi | sparkle | `Sparkles` |
| Verified | check badge | `BadgeCheck` (fill `--accent`) |
| Buku Menu tab | fork & knife | `UtensilsCrossed` |
| Tagihan Meja tab | receipt | `ReceiptText` |
| Bantuan tab | headset | `Headset` |

---

## 4. Tailwind / CSS implementation of tokens

```css
/* apps/web/app/(public)/order/theme.css */
@theme {
  --color-bg: #F6F4EF;
  --color-surface: #FFFFFF;
  --color-surface-muted: #EFECE5;
  --color-ink: #141414;
  --color-muted: #6F6B64;
  --color-subtle: #A19C93;
  --color-line: #E7E3DB;
  --color-amber-bg: #F6E3A8;
  --color-amber-fg: #7A5B12;
  --color-accent: #8C7A3B;
  --color-success: #3DA35D;
  --color-best: #4E7A55;
  --color-danger: #C2412D;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 14px;

  --shadow-card: 0 1px 2px rgb(20 20 20 / 0.04);
  --shadow-float: 0 8px 24px rgb(20 20 20 / 0.18);

  --font-sans: var(--font-jakarta), ui-sans-serif, system-ui, sans-serif;
}
```

If the project is still on Tailwind v3, put the same values in `tailwind.config.ts > theme.extend` instead.

Map shadcn variables for this route group so shadcn primitives (Sheet, Dialog, Button) inherit the look:

```css
.public-menu {
  --background: 42 27% 95%;   /* #F6F4EF */
  --foreground: 0 0% 8%;      /* #141414 */
  --card: 0 0% 100%;
  --primary: 0 0% 8%;
  --primary-foreground: 0 0% 100%;
  --muted: 43 20% 92%;        /* #EFECE5 */
  --muted-foreground: 37 5% 41%;
  --border: 40 19% 88%;
  --ring: 0 0% 8%;
  --radius: 0.75rem;
}
```

---

## 5. Components

### A. `MenuHeader` (sticky top)

- Height 56px, bg `--bg`, bottom hairline appears only after scroll (`data-scrolled`).
- Left: 28px logo tile (`--surface-muted`, `--radius-sm`) + two-line stack: `overline` tenant group name, `title-app` "Table Menu" + amber pill `Meja {n}`.
- Right: three 32px circular buttons, gap 8px.
  - Bell (`--surface-muted`) → opens **Panggil Pelayan** sheet.
  - Search (`--surface-muted`) → focuses search input / expands search on mobile.
  - Profile (`--ink` bg, white icon) → guest session sheet (name for order, leave table).
- `aria-label` on every icon button: "Panggil pelayan", "Cari menu", "Sesi tamu".

### B. `RestaurantCard`

- White card, `--radius-md`, padding 12px, flex row, align center.
- 36px icon tile (`--surface-muted`) with outlet logo or fallback icon.
- Name: `title-brand` + `BadgeCheck` 14px in `--accent` (only when outlet is verified).
- Tagline: `body-sm` muted, single line, ellipsis.
- Right cluster (right-aligned): chip `• Meja {n}` (`--surface-muted`, green dot = session active) and caption `Dine-in • QR Order`.
- **Mobile fix:** the mock clips this chip at 360–390px. Below 400px, move the right cluster **under** the name (wrap) or drop the chip, since the header already shows the table.

### C. `MenuSearch`

- Height 40px, `--surface-muted` fill, no border, `--radius-md`, left `Search` icon 14px, right `SlidersHorizontal` button (opens **Filter** sheet).
- Placeholder: "Cari makanan favorit, kopi, atau dessert…".
- Debounce 250ms; search runs client-side over the loaded menu (menus are small) and falls back to API if the menu is paginated.
- When query is non-empty: hide category rail highlight, show section header "Hasil untuk "{q}"" + count.

### D. `CategoryRail` (vertical, sticky)

- Tile: 48×48 mobile / 44×44 tablet+, `--radius-sm`, column: icon 16px + `caption` label.
- Inactive: `--surface` bg, `--muted` icon/label.
- Active: `--ink` bg, white icon/label, weight 600.
- Categories are data-driven (`icon` key from API mapped to Lucide), first item is always the virtual "Populer".
- Behavior: tap → smooth-scroll list to that section; scroll-spy (IntersectionObserver) updates active tile. Use `role="tablist"` / `role="tab"` + `aria-selected`, or a `<nav>` with `aria-current`.
- Very long category lists: the rail itself scrolls (`overflow-y: auto`, hidden scrollbar).

### E. `SectionHeader`

- Row: `title-section` + count pill (`badge`, `--surface-muted`, e.g. "5 Menu") + right link "✦ Rekomendasi" (`caption`, `--accent`).
- **Mobile fix:** in the mock the title wraps to two lines and the pill breaks. Keep everything on one line: `whitespace-nowrap` on title and pill, and collapse the link to icon-only (`Sparkles` + sr-only text) below 400px.

### F. `MenuItemCard`

Structure: image on top, content below, full card width of the list column.

- Card: `--surface`, `--radius-lg`, overflow hidden, `--shadow-card`.
- Image: `next/image`, `object-cover`, **fixed aspect ratio 4:3 on mobile, 16:10 tablet+** (see responsive issues below). Rounded top corners only.
- Badge (top-left, 8px inset): pill `--badge-bg` + `backdrop-blur-sm`, `badge` type. Variants:
  - `chef_pick` → "Chef's Pick", text `--ink`
  - `best_seller` → "Best Seller", text `--best`
  - `new` → "Baru", `spicy` → "Pedas" (reserved)
- Content padding 12px:
  - Name `title-item`, 1 line clamp.
  - Description `body-sm` muted, **2-line clamp** (`line-clamp-2`).
  - Footer row: price `price` left, CTA right.
- CTA states:
  - Qty 0: black pill "+ Tambah" (h 32, px 12, `button`).
  - Qty ≥ 1: black pill stepper `[−] 2 [+]` same width; `−` at 1 removes.
  - Item has required options (size, sugar level, add-ons): "+ Tambah" opens **Item Detail** sheet instead of adding directly.
  - Sold out: image grayscale 60%, badge "Habis", CTA disabled "Habis".
- Whole card (except CTA) is tappable → Item Detail sheet.

### G. `CartBar` (floating)

- Shown only when cart has ≥1 item; slides up 16px + fade on first add (the one orchestrated motion; respect `prefers-reduced-motion`).
- Position: fixed, above tab bar, inset 12px horizontally, max-width matches content column.
- `--ink` bg, `--radius-full`, h 52px, `--shadow-float`, padding 6px 6px 6px 8px.
- Left: 28px white circle with item count (`--ink` text, 700) + stack: "Total Pesanan" `caption` (white 70%) and total `price-lg` white.
- Right: white pill "Lihat Pesanan →" (h 40) → opens **Cart** sheet/page.
- Total animates count-up on change (≤200ms).
- `aria-live="polite"` region announcing "2 item, total Rp 85.000".

### H. `BottomTabBar`

- Fixed bottom, h 56 + `env(safe-area-inset-bottom)`, bg `--bg`.
- 3 tabs, equal width: Buku Menu, Tagihan Meja, Bantuan. Icon 18px + `caption`.
- Active: icon + label `--ink`, weight 600, with `--surface-muted` pill behind icon+label (as in mock). Inactive: `--muted`.
- Tagihan Meja can show a dot when there's an unpaid/active bill.

---

## 6. Responsive behavior

The Stitch mock renders the **same single-column list** at all three sizes, which breaks down on larger screens (desktop image is ~660px tall, only one item visible per viewport). Implement this instead:

| Breakpoint | Width | Layout |
|---|---|---|
| Mobile | < 640px | Rail 48px + 1-column list. Image 4:3. Restaurant card chip wraps. |
| Tablet | 640–1023px | Rail 56px + **2-column** grid. Image 16:10. |
| Desktop | ≥ 1024px | Content max-width **1120px**, centered. Rail becomes 180px vertical list with icon + label inline. **3-column** grid. Cart bar max-width 720px centered, or a right-side cart panel (≥1280px). |

Other rules:
- Header, search and restaurant card share the same max-width container as the grid.
- Never let a single image exceed ~320px height.
- Add `viewport-fit=cover` and safe-area padding for the fixed bottom bars.
- Bottom padding of the list = cart bar height + tab bar height + 16px, so the last card is not hidden.

---

## 7. Supporting screens (not in mock, required for the flow)

Keep the same tokens and components.

1. **Item Detail sheet** (shadcn `Sheet side="bottom"` mobile, `Dialog` desktop): hero image 16:9, name, description (full), option groups (radio = required, checkbox = add-ons with `+Rp` price), notes textarea ("Catatan untuk dapur"), sticky footer: stepper + "Tambah · Rp 78.000".
2. **Cart (Lihat Pesanan)**: list of lines (thumb 48px, name, options summary, stepper, line total), order notes, summary (Subtotal, Pajak/Service if tenant configured, Total), primary CTA "Kirim Pesanan". Confirm dialog before sending.
3. **Order sent state**: success screen/toast "Pesanan dikirim ke dapur", order number, status chips per line: Diterima → Dimasak → Siap → Diantar. Poll or SSE for updates.
4. **Tagihan Meja**: all orders from this table session, grouped by round, running total, status; CTA "Minta Tagihan" (calls cashier) — payment method depends on tenant (kasir / QRIS).
5. **Bantuan / Panggil Pelayan**: quick actions — "Panggil pelayan", "Minta air putih", "Minta alat makan", "Minta tagihan" — each sends a service request; show cooldown (e.g. 60s) to avoid spam.
6. **Filter sheet**: dietary tags, price range, sort (Populer, Harga terendah, Harga tertinggi).

### States
- **Loading:** skeletons matching card shape (image block + 3 lines); rail skeleton tiles.
- **Empty search:** "Menu "{q}" tidak ditemukan. Coba kata lain atau lihat kategori." + button "Hapus pencarian".
- **Empty category:** "Belum ada menu di kategori ini."
- **Outlet closed / outside hours:** menu is browsable, add buttons disabled, banner "Dapur sedang tutup. Buka lagi pukul 10.00."
- **Invalid/expired table token:** full-page state "QR meja tidak valid. Minta bantuan pelayan untuk memindai ulang."
- **Network error on send:** Sonner error toast "Pesanan gagal dikirim. Periksa koneksi lalu coba lagi." — keep cart intact.
- **Price changed / item sold out at submit:** block submit, highlight affected lines, explain which changed.

---

## 8. Routing & data (apps/web)

```
app/
  (public)/
    order/
      [tenantSlug]/
        [tableToken]/
          layout.tsx        # fonts, .public-menu theme, providers, TableSessionProvider
          page.tsx          # Buku Menu (this design)
          cart/page.tsx     # Lihat Pesanan (or sheet via intercepting route)
          bill/page.tsx     # Tagihan Meja
          help/page.tsx     # Bantuan
```

- Resolve the table on the server (`page.tsx` as Server Component): fetch outlet, table, categories and items; pass to client components as initial data for TanStack Query (`HydrationBoundary`).
- Cart state: client-side (Zustand or `useReducer` + context), persisted to `sessionStorage` keyed by `tableToken` so a refresh doesn't lose the cart. Server is source of truth only after "Kirim Pesanan".
- Always re-price on the server when submitting; never trust client totals.

### Suggested types

```ts
type TableSession = {
  tenantSlug: string;
  outlet: { id: string; name: string; tagline?: string; logoUrl?: string; verified: boolean; isOpen: boolean };
  table: { id: string; code: string; label: string }; // label = "Meja 12"
  serviceMode: "dine_in";
};

type MenuCategory = {
  id: string;
  name: string;           // "Makanan"
  icon: "flame" | "bowl" | "coffee" | "glass" | "cake" | "cookie" | string;
  sortOrder: number;
};

type MenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;          // integer rupiah
  imageUrl?: string;
  badges: Array<"chef_pick" | "best_seller" | "new" | "spicy">;
  isPopular: boolean;
  isAvailable: boolean;
  optionGroups: OptionGroup[];
};

type OptionGroup = {
  id: string; name: string; required: boolean; min: number; max: number;
  options: { id: string; name: string; priceDelta: number; isAvailable: boolean }[];
};

type CartLine = {
  lineId: string;          // itemId + hash(options + note)
  itemId: string;
  qty: number;
  optionIds: string[];
  note?: string;
  unitPrice: number;       // display only
};
```

### Formatting helper

```ts
export const formatRupiah = (n: number) =>
  "Rp " + new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
// formatRupiah(78000) -> "Rp 78.000"
```

---

## 9. Component tree

```
<PublicMenuLayout>                  // theme, safe areas
  <MenuHeader />
  <main className="container">
    <RestaurantCard />
    <MenuSearch />
    <div className="menu-body">     // grid: rail | list
      <CategoryRail />
      <MenuSections>
        <MenuSection id="populer">
          <SectionHeader />
          <MenuGrid>
            <MenuItemCard /> …
          </MenuGrid>
        </MenuSection>
        …
      </MenuSections>
    </div>
  </main>
  <CartBar />
  <BottomTabBar />
  <ItemDetailSheet />
  <CallWaiterSheet />
  <FilterSheet />
</PublicMenuLayout>
```

---

## 10. Accessibility checklist

- Contrast: `--muted` on `--surface` ≈ 5.2:1 (passes AA for body-sm). `--accent` on `--bg` ≈ 4.0:1 → use only at ≥ 14px bold or add underline; don't use it for body text.
- All icon-only buttons have `aria-label`; rail tiles expose their text label.
- Stepper buttons: "Kurangi {nama}", "Tambah {nama}"; current qty announced.
- Focus ring: 2px `--ink` with 2px offset on cream.
- Sheets trap focus and return focus to the trigger (Radix handles this).
- `prefers-reduced-motion`: disable cart-bar slide and count-up, keep instant state change.
- `lang="id"` on the route group.

---

## 11. Issues found in the mock (fix before build)

1. **Table number mismatch:** header pill says "Meja 12", restaurant card chip says "Meja 14". Both must come from the same `table.label`.
2. **Clipped chip on mobile:** "• Meja 1…" and "Dine-in • QR Order" are cut off at the right edge of the restaurant card.
3. **Section header wraps on mobile:** "Pilihan Populer" breaks into two lines and "5 Menu" pill wraps.
4. **No responsive grid:** tablet and desktop just scale up one card; images become oversized.
5. **Cart total vs item price:** "2 item — Rp 85.000" while one item alone is Rp 78.000 — fine as placeholder, but make sure demo data is consistent in screenshots/specs.
6. **Header search + body search duplication:** two search affordances. Recommended: header search icon scrolls to and focuses the body search on mobile; hide it on tablet+ where the search bar is always visible.
7. **Profile button purpose undefined** for a public guest flow. Define it (guest name / leave table) or remove it.

---

## 12. Build order

1. Tokens + font + `.public-menu` theme scope.
2. Static layout: header, restaurant card, search, rail, section header, card, cart bar, tab bar (mock data).
3. Responsive grid + sticky/scroll-spy behavior.
4. Cart store + stepper + cart bar.
5. Item Detail sheet with option groups.
6. Server data loading by `tenantSlug` + `tableToken`, error/closed states.
7. Cart page + submit order + order status.
8. Tagihan Meja, Bantuan / call waiter.
9. A11y + reduced-motion pass, test at 360px, 390px, 768px, 1024px, 1440px.