"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatIdr } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useMergeSession, useTransferSession } from "../hooks/use-table-sessions"
import type { ActiveTableSession, Table } from "../types"

/**
 * Move the party to a free table, or merge its tab into another table's tab.
 * Orders, requests and the bill travel along; guests' phones follow.
 */
export function MoveMergeDialog({
  session,
  tables,
  sessions,
  onOpenChange,
}: {
  session: ActiveTableSession | null
  tables: Table[]
  sessions: ActiveTableSession[]
  onOpenChange: (open: boolean) => void
}) {
  const [mode, setMode] = useState<"move" | "merge">("move")
  const [target, setTarget] = useState("")
  const transfer = useTransferSession()
  const merge = useMergeSession()

  const busyTables = new Set(sessions.map((s) => s.tableId))
  const freeTables = tables.filter((t) => !busyTables.has(t.id))
  const mergeTargets = sessions.filter((s) => s.id !== session?.id && s.status === "open")
  const paying = session?.status === "billing"

  function close() {
    setTarget("")
    setMode("move")
    onOpenChange(false)
  }

  function submit() {
    if (!session || !target) return
    if (mode === "move") {
      const to = tables.find((t) => t.id === target)
      transfer.mutate(
        { sessionId: session.id, toTableId: target },
        {
          onSuccess: () => {
            toast.success(`${session.tableName} moved to ${to?.name}`)
            close()
          },
          onError: (e) => toast.error(e.message),
        },
      )
    } else {
      const into = sessions.find((s) => s.id === target)
      merge.mutate(
        { sessionId: session.id, intoSessionId: target },
        {
          onSuccess: () => {
            toast.success(`${session.tableName} merged into ${into?.tableName}`)
            close()
          },
          onError: (e) => toast.error(e.message),
        },
      )
    }
  }

  const options =
    mode === "move"
      ? freeTables.map((t) => ({ id: t.id, label: t.name, hint: `${t.capacity} seats` }))
      : mergeTargets.map((s) => ({
          id: s.id,
          label: s.tableName,
          hint: `${s.orderCount} order(s) · ${formatIdr(s.bill.totalAmount)}`,
        }))

  return (
    <Dialog open={!!session} onOpenChange={(open) => (open ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move or merge · {session?.tableName}</DialogTitle>
          <DialogDescription>
            {session && `${session.orderCount} order(s) · ${formatIdr(session.bill.totalAmount)}. Guests' phones follow automatically.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1" role="radiogroup" aria-label="Action">
          {(
            [
              ["move", "Move to a free table"],
              ["merge", "Merge into a table"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => {
                setMode(value)
                setTarget("")
              }}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-medium",
                mode === value ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "merge" && paying ? (
          <p className="text-sm text-muted-foreground">
            This table is paying. Unlock its bill first to merge it into another tab.
          </p>
        ) : options.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {mode === "move" ? "No free tables right now." : "No other open tabs to merge into."}
          </p>
        ) : (
          <ul className="max-h-64 space-y-1.5 overflow-y-auto" role="radiogroup" aria-label={mode === "move" ? "Free tables" : "Open tabs"}>
            {options.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={target === o.id}
                  onClick={() => setTarget(o.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm",
                    target === o.id ? "border-primary bg-primary/10" : "hover:bg-muted",
                  )}
                >
                  <span className="font-medium">{o.label}</span>
                  <span className="text-xs text-muted-foreground">{o.hint}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {mode === "merge" && (
          <p className="text-xs text-muted-foreground">
            {session?.tableName}&apos;s orders join the chosen table&apos;s bill and {session?.tableName} becomes free.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button disabled={!target || transfer.isPending || merge.isPending} onClick={submit}>
            {mode === "move" ? "Move party" : "Merge tabs"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
