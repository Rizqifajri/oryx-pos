"use client"

import { cn } from "@/lib/utils"
import { TAB_BAR_SPACE } from "../components/bottom-bars"
import { HelpActions } from "../components/help-actions"
import { SubPageHeader } from "../components/menu-header"

/** Bantuan — service requests to staff (call waiter, water, cutlery, bill). */
export function HelpPage() {
  return (
    <>
      <SubPageHeader title="Bantuan" />
      <main className={cn("mx-auto max-w-[720px] space-y-3 px-3 pt-3 sm:px-4", TAB_BAR_SPACE)}>
        <p className="text-[13px] leading-[19px] text-pm-muted">
          Butuh sesuatu? Pilih permintaan di bawah, staf kami akan segera datang ke meja Anda.
        </p>
        <HelpActions />
      </main>
    </>
  )
}
