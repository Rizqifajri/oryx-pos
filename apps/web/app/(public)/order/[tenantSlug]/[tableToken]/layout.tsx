import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import { Toaster } from "sonner"
import { cn } from "@/lib/utils"
import { GuestCartProvider } from "@/features/table-order/cart-store"
import { SessionGate } from "@/features/table-order/components/session-gate"
import { TableSessionProvider } from "@/features/table-order/session-context"

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
})

export const metadata: Metadata = {
  title: "Menu Meja",
  description: "Pesan langsung dari meja Anda",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#F6F4EF",
  colorScheme: "light",
}

/**
 * Public, unauthenticated guest ordering for one table, reached by scanning
 * the table's QR code. The table token (not the table id) identifies the table.
 */
export default async function TableOrderLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenantSlug: string; tableToken: string }>
}) {
  const { tenantSlug, tableToken } = await params

  return (
    <div lang="id" className={cn(jakarta.variable, "public-menu min-h-dvh w-full bg-pm-bg text-pm-ink")}>
      {/* Sheets and dialogs portal to <body>, outside this wrapper, so the
          font variable is also defined at the root for them. */}
      <style>{`:root { --font-jakarta: ${jakarta.style.fontFamily}; }`}</style>
      <TableSessionProvider tenantSlug={tenantSlug} tableToken={tableToken}>
        <GuestCartProvider tableToken={tableToken}>
          <SessionGate>{children}</SessionGate>
        </GuestCartProvider>
      </TableSessionProvider>
      <Toaster
        position="top-center"
        theme="light"
        toastOptions={{ className: "public-menu", style: { fontFamily: "var(--font-jakarta)" } }}
        offset={{ top: "calc(64px + env(safe-area-inset-top))" }}
      />
    </div>
  )
}
