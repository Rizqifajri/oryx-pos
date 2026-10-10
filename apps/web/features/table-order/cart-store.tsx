"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react"
import type { MenuItem } from "./types"

export type GuestCartLine = {
  /** menuId + note: the same item with a different kitchen note is its own line. */
  lineId: string
  menuId: string
  name: string
  imageUrl: string | null
  /** Price shown when added (cents). Display only — the server re-prices. */
  unitPrice: number
  quantity: number
  note: string
}

type CartState = { lines: GuestCartLine[]; note: string; hydrated: boolean }

type Action =
  | { type: "hydrate"; state: Pick<CartState, "lines" | "note"> }
  | { type: "add"; item: MenuItem; quantity: number; note: string }
  | { type: "setQuantity"; lineId: string; quantity: number }
  | { type: "decrementItem"; menuId: string }
  | { type: "setNote"; note: string }
  | { type: "repriceItem"; menuId: string; unitPrice: number }
  | { type: "removeItem"; menuId: string }
  | { type: "clear" }

const MAX_QTY = 50

export const makeLineId = (menuId: string, note: string) => `${menuId}::${note.trim()}`

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "hydrate":
      return { ...action.state, hydrated: true }
    case "add": {
      const note = action.note.trim()
      const lineId = makeLineId(action.item.id, note)
      const existing = state.lines.find((l) => l.lineId === lineId)
      if (existing) {
        return {
          ...state,
          lines: state.lines.map((l) =>
            l.lineId === lineId
              ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + action.quantity) }
              : l,
          ),
        }
      }
      return {
        ...state,
        lines: [
          ...state.lines,
          {
            lineId,
            menuId: action.item.id,
            name: action.item.name,
            imageUrl: action.item.imageUrl,
            unitPrice: action.item.price,
            quantity: Math.min(MAX_QTY, action.quantity),
            note,
          },
        ],
      }
    }
    case "setQuantity":
      return {
        ...state,
        lines:
          action.quantity <= 0
            ? state.lines.filter((l) => l.lineId !== action.lineId)
            : state.lines.map((l) =>
                l.lineId === action.lineId
                  ? { ...l, quantity: Math.min(MAX_QTY, action.quantity) }
                  : l,
              ),
      }
    case "decrementItem": {
      const line = [...state.lines].reverse().find((l) => l.menuId === action.menuId)
      if (!line) return state
      return reducer(state, {
        type: "setQuantity",
        lineId: line.lineId,
        quantity: line.quantity - 1,
      })
    }
    case "setNote":
      return { ...state, note: action.note }
    case "repriceItem":
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.menuId === action.menuId ? { ...l, unitPrice: action.unitPrice } : l,
        ),
      }
    case "removeItem":
      return { ...state, lines: state.lines.filter((l) => l.menuId !== action.menuId) }
    case "clear":
      return { ...state, lines: [], note: "" }
  }
}

type GuestCartValue = {
  lines: GuestCartLine[]
  note: string
  itemCount: number
  subtotal: number
  hydrated: boolean
  add: (item: MenuItem, quantity?: number, note?: string) => void
  setQuantity: (lineId: string, quantity: number) => void
  /** Total quantity of an item across all its lines (for the card stepper). */
  quantityOf: (menuId: string) => number
  /** Card stepper "−": takes one off the item's most recently added line. */
  decrementItem: (menuId: string) => void
  setNote: (note: string) => void
  repriceItem: (menuId: string, unitPrice: number) => void
  removeItem: (menuId: string) => void
  clear: () => void
}

const GuestCartContext = createContext<GuestCartValue | null>(null)

/**
 * The guest's cart for one table — client-side only until "Kirim Pesanan".
 * Persisted to sessionStorage per table token, so a refresh keeps it and a
 * different table starts empty. Not shared between devices at the table.
 */
export function GuestCartProvider({
  tableToken,
  children,
}: {
  tableToken: string
  children: React.ReactNode
}) {
  const storageKey = `dio_table_cart:${tableToken}`
  const [state, dispatch] = useReducer(reducer, { lines: [], note: "", hydrated: false })

  useEffect(() => {
    let stored: Pick<CartState, "lines" | "note"> = { lines: [], note: "" }
    try {
      const raw = sessionStorage.getItem(storageKey)
      if (raw) stored = JSON.parse(raw)
    } catch {
      // Unreadable storage: start empty.
    }
    dispatch({ type: "hydrate", state: stored })
  }, [storageKey])

  useEffect(() => {
    if (!state.hydrated) return
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ lines: state.lines, note: state.note }))
    } catch {
      // Storage full or disabled: the cart still works for this page view.
    }
  }, [state, storageKey])

  const quantityOf = useCallback(
    (menuId: string) =>
      state.lines.filter((l) => l.menuId === menuId).reduce((sum, l) => sum + l.quantity, 0),
    [state.lines],
  )

  const value = useMemo<GuestCartValue>(
    () => ({
      lines: state.lines,
      note: state.note,
      hydrated: state.hydrated,
      itemCount: state.lines.reduce((sum, l) => sum + l.quantity, 0),
      subtotal: state.lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
      add: (item, quantity = 1, note = "") => dispatch({ type: "add", item, quantity, note }),
      setQuantity: (lineId, quantity) => dispatch({ type: "setQuantity", lineId, quantity }),
      quantityOf,
      decrementItem: (menuId) => dispatch({ type: "decrementItem", menuId }),
      setNote: (note) => dispatch({ type: "setNote", note }),
      repriceItem: (menuId, unitPrice) => dispatch({ type: "repriceItem", menuId, unitPrice }),
      removeItem: (menuId) => dispatch({ type: "removeItem", menuId }),
      clear: () => dispatch({ type: "clear" }),
    }),
    [state, quantityOf],
  )

  return <GuestCartContext.Provider value={value}>{children}</GuestCartContext.Provider>
}

export function useGuestCart() {
  const ctx = useContext(GuestCartContext)
  if (!ctx) throw new Error("useGuestCart must be used inside GuestCartProvider")
  return ctx
}
