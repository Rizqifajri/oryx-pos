"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { DEFAULT_KITCHEN_SETTINGS, type KitchenSettings } from "../hooks/use-kitchen-settings"

type Toggle = { [K in keyof KitchenSettings]: KitchenSettings[K] extends boolean ? K : never }[keyof KitchenSettings]

const TOGGLES: { key: Toggle; label: string; hint: string }[] = [
  { key: "showStart", label: "Start cooking button", hint: "Moves new orders to Cooking" },
  { key: "showServe", label: "Served button", hint: "Finishes table (QR) orders — paid on the table bill" },
  { key: "showComplete", label: "Done button", hint: "Finishes takeout orders and records the payment" },
  { key: "confirmFinish", label: "Confirm before finishing", hint: "Tap Done twice so orders don't vanish by accident" },
  { key: "showItemBar", label: "Items-to-cook bar", hint: "Totals per menu item along the bottom" },
  { key: "showLegend", label: "Colour key", hint: "Timer legend in the top bar" },
  { key: "showBackButton", label: "Back button", hint: "Hide it to keep staff on this screen" },
]

export function KitchenSettingsSheet({
  open,
  onOpenChange,
  settings,
  onSave,
  dark,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: KitchenSettings
  onSave: (settings: KitchenSettings) => void
  dark: boolean
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn("overflow-y-auto", dark && "dark")}>
        {/* Remount on open so the draft starts from the saved settings. */}
        {open && (
          <SettingsForm
            settings={settings}
            onSave={(next) => {
              onSave(next)
              onOpenChange(false)
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function SettingsForm({ settings, onSave }: { settings: KitchenSettings; onSave: (s: KitchenSettings) => void }) {
  const [draft, setDraft] = useState(settings)
  const error =
    !Number.isInteger(draft.warnMin) || !Number.isInteger(draft.lateMin) || draft.warnMin < 1
      ? "Use whole minutes, 1 or more."
      : draft.lateMin <= draft.warnMin
        ? "Late must be after the warning time."
        : null

  return (
    <form
      className="flex flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault()
        if (!error) onSave(draft)
      }}
    >
      <SheetHeader>
        <SheetTitle>Kitchen display settings</SheetTitle>
        <SheetDescription>Saved on this screen only.</SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-5 px-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Ticket timer (minutes)</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              Amber after
              <Input
                type="number"
                min={1}
                value={draft.warnMin}
                onChange={(e) => setDraft({ ...draft, warnMin: e.target.valueAsNumber })}
                aria-invalid={!!error}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              Red (late) after
              <Input
                type="number"
                min={2}
                value={draft.lateMin}
                onChange={(e) => setDraft({ ...draft, lateMin: e.target.valueAsNumber })}
                aria-invalid={!!error}
              />
            </label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-sm font-medium">Show on screen</legend>
          {TOGGLES.map((t) => (
            <label key={t.key} className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-primary"
                checked={draft[t.key]}
                disabled={t.key === "confirmFinish" && !draft.showServe && !draft.showComplete}
                onChange={(e) => setDraft({ ...draft, [t.key]: e.target.checked })}
              />
              <span className="flex flex-col">
                <span className="text-sm font-medium">{t.label}</span>
                <span className="text-xs text-muted-foreground">{t.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </div>

      <SheetFooter className="mt-auto">
        <Button type="submit" disabled={!!error}>
          Save
        </Button>
        <Button type="button" variant="outline" onClick={() => setDraft(DEFAULT_KITCHEN_SETTINGS)}>
          Reset to defaults
        </Button>
      </SheetFooter>
    </form>
  )
}
