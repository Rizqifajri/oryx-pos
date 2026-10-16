"use client"

import { useState } from "react"

export type KitchenSettings = {
  /** Minutes after which a ticket turns amber, then red. */
  warnMin: number
  lateMin: number
  /** Ticket buttons, one per step of the kitchen flow. */
  showStart: boolean
  showServe: boolean
  showComplete: boolean
  /** Finishing needs a second tap within 3s. */
  confirmFinish: boolean
  showItemBar: boolean
  showLegend: boolean
  showBackButton: boolean
}

export const DEFAULT_KITCHEN_SETTINGS: KitchenSettings = {
  warnMin: 8,
  lateMin: 15,
  showStart: true,
  showServe: true,
  showComplete: true,
  confirmFinish: true,
  showItemBar: true,
  showLegend: true,
  showBackButton: true,
}

const SETTINGS_KEY = "kitchen-settings"

/** Per-TV settings, remembered in this browser. */
export function useKitchenSettings() {
  const [settings, setSettings] = useState<KitchenSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_KITCHEN_SETTINGS
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}")
      return { ...DEFAULT_KITCHEN_SETTINGS, ...saved }
    } catch {
      return DEFAULT_KITCHEN_SETTINGS
    }
  })
  function save(next: KitchenSettings) {
    setSettings(next)
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
    } catch {}
  }
  return [settings, save] as const
}
