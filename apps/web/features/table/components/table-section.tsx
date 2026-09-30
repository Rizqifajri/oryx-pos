"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PermissionGuard } from "@/components/guards"
import { PERMISSIONS } from "@/constants/permissions"
import { cn } from "@/lib/utils"
import { Plus, Edit, Trash2, Users, QrCode, Receipt, Lock, XCircle } from "lucide-react"
import { toast } from "sonner"

import { useTables, useDeleteTable, useUpdateTableStatus } from "../hooks/use-tables"
import {
  useActiveSessions,
  useCloseSession,
  useMyTenant,
  useUnlockSessionBill,
  useUpdateMyTenant,
} from "../hooks/use-table-sessions"
import { TableFormDialog } from "./table-form-dialog"
import { TableQrDialog } from "./table-qr-dialog"
import { formatIdr } from "@/lib/format"
import { SettleBillDialog } from "./settle-bill-dialog"
import type { ActiveTableSession, Table, TableStatus } from "../types"

interface TableSectionProps {
  tenantId?: string | null
}

const STATUS_TABS: { label: string; value: TableStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Available", value: "AVAILABLE" },
  { label: "Occupied", value: "OCCUPIED" },
]

const STATUS_STYLES: Record<TableStatus, string> = {
  AVAILABLE: "bg-green-50 text-green-700 ring-green-600/20",
  OCCUPIED: "bg-orange-50 text-orange-700 ring-orange-600/20",
}

const STATUS_LABEL: Record<TableStatus, string> = {
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
}

export function TableSection({ tenantId }: TableSectionProps = {}) {
  const [activeTab, setActiveTab] = useState<TableStatus | "ALL">("ALL")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const [qrTableId, setQrTableId] = useState<string | null>(null)
  const [settling, setSettling] = useState<ActiveTableSession | null>(null)

  // Build filters object conditionally
  const filters = {
    ...(tenantId ? { tenantId } : {}),
    ...(activeTab !== "ALL" ? { status: activeTab } : {}),
  }
  const hasFilters = Object.keys(filters).length > 0

  const { data: tables = [], isLoading } = useTables(hasFilters ? filters : undefined)
  const { mutateAsync: deleteTable, isPending: isDeleting } = useDeleteTable()
  const { mutateAsync: updateStatus } = useUpdateTableStatus()
  const { data: sessions = [] } = useActiveSessions(tenantId)
  const sessionByTable = new Map(sessions.map((s) => [s.tableId, s]))
  const closeSession = useCloseSession()
  const unlockBill = useUnlockSessionBill()

  const handleCloseSession = (session: ActiveTableSession) => {
    if (!confirm(`End the guest session at ${session.tableName}?`)) return
    closeSession.mutate(
      { sessionId: session.id },
      {
        onSuccess: () => toast.success(`${session.tableName} session closed`),
        onError: (error) => {
          if (
            error.code === "UNPAID_ORDERS" &&
            confirm(`${error.message}\n\nClose anyway and leave those orders unpaid?`)
          ) {
            closeSession.mutate(
              { sessionId: session.id, force: true, reason: "voided by staff" },
              {
                onSuccess: () => toast.success(`${session.tableName} session voided`),
                onError: (e) => toast.error(e.message),
              },
            )
          } else if (error.code !== "UNPAID_ORDERS") {
            toast.error(error.message)
          }
        },
      },
    )
  }

  const handleCreate = () => {
    setEditingTable(null)
    setDialogOpen(true)
  }

  const handleEdit = (table: Table) => {
    setEditingTable(table)
    setDialogOpen(true)
  }

  const handleDelete = async (table: Table) => {
    if (!confirm(`Are you sure you want to delete ${table.name}?`)) return

    try {
      await deleteTable(table.id)
      toast.success("Table deleted successfully")
    } catch (error: any) {
      toast.error(error.message || "Failed to delete table")
    }
  }

  const handleToggleStatus = async (table: Table) => {
    const newStatus = table.status === "AVAILABLE" ? "OCCUPIED" : "AVAILABLE"
    
    try {
      await updateStatus({ id: table.id, status: newStatus })
      toast.success(`Table ${table.name} is now ${STATUS_LABEL[newStatus].toLowerCase()}`)
    } catch (error: any) {
      toast.error(error.message || "Failed to update table status")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-3">
        <QrOrderingToggle />
        <PermissionGuard permissions={PERMISSIONS.TABLE_CREATE}>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Table
          </Button>
        </PermissionGuard>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.value
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Capacity</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Guest session</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Skeleton className="mx-auto h-4 w-8" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Skeleton className="mx-auto h-5 w-20 rounded-full" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-28" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-28" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Skeleton className="ml-auto h-8 w-24" />
                  </td>
                </tr>
              ))}

            {!isLoading && tables.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  No tables found.
                </td>
              </tr>
            )}

            {tables.map((table) => (
              <tr key={table.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{table.name}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{table.capacity}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggleStatus(table)}
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors hover:opacity-80",
                      STATUS_STYLES[table.status],
                    )}
                  >
                    {STATUS_LABEL[table.status]}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <SessionCell
                    session={sessionByTable.get(table.id)}
                    onSettle={setSettling}
                    onClose={handleCloseSession}
                    onUnlock={(s) =>
                      unlockBill.mutate(s.id, {
                        onSuccess: () => toast.success(`${s.tableName} can order again`),
                        onError: (e) => toast.error(e.message),
                      })
                    }
                  />
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("id-ID", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(table.createdAt))}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Guest QR code"
                      onClick={() => setQrTableId(table.id)}
                    >
                      <QrCode className="h-4 w-4" />
                    </Button>
                    <PermissionGuard permissions={PERMISSIONS.TABLE_UPDATE}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(table)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </PermissionGuard>
                    <PermissionGuard permissions={PERMISSIONS.TABLE_DELETE}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(table)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </PermissionGuard>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TableQrDialog tableId={qrTableId} onOpenChange={(open) => !open && setQrTableId(null)} />
      <SettleBillDialog session={settling} onOpenChange={(open) => !open && setSettling(null)} />

      <TableFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        table={editingTable}
        filterTenantId={tenantId}
      />
    </div>
  )
}

function SessionCell({
  session,
  onSettle,
  onClose,
  onUnlock,
}: {
  session?: ActiveTableSession
  onSettle: (session: ActiveTableSession) => void
  onClose: (session: ActiveTableSession) => void
  onUnlock: (session: ActiveTableSession) => void
}) {
  if (!session) return <span className="text-xs text-muted-foreground">—</span>

  const paying = session.status === "billing"
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="min-w-0">
        <p className="text-xs font-medium">
          {paying
            ? session.bill.paymentMethod === "cashier"
              ? "Waiting for cashier"
              : "Paying online"
            : `${session.orderCount} order(s)`}
        </p>
        <p className="text-xs tabular-nums text-muted-foreground">{formatIdr(session.bill.totalAmount)}</p>
      </div>
      <div className="flex gap-1">
        <PermissionGuard
          permissions={[PERMISSIONS.TRANSACTION_CREATE, PERMISSIONS.TRANSACTION_MANAGE]}
          requireAll={false}
        >
          <Button
            size="sm"
            variant={paying && session.bill.paymentMethod === "cashier" ? "default" : "outline"}
            disabled={session.bill.totalAmount === 0}
            onClick={() => onSettle(session)}
            title="Record payment and close"
          >
            <Receipt className="mr-1 h-3.5 w-3.5" /> Settle
          </Button>
        </PermissionGuard>
        <PermissionGuard permissions={[PERMISSIONS.TABLE_UPDATE, PERMISSIONS.TABLE_MANAGE]} requireAll={false}>
          {paying && (
            <Button size="sm" variant="ghost" onClick={() => onUnlock(session)} title="Cancel payment, allow ordering">
              <Lock className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => onClose(session)}
            title="End session"
          >
            <XCircle className="h-3.5 w-3.5" />
          </Button>
        </PermissionGuard>
      </div>
    </div>
  )
}

/** Tenant-wide switch: when off, guests can browse the QR menu but not order. */
function QrOrderingToggle() {
  const { data: tenant } = useMyTenant()
  const update = useUpdateMyTenant()
  if (!tenant) return null
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="size-4"
        checked={tenant.isOpen}
        disabled={update.isPending}
        onChange={(e) =>
          update.mutate(
            { isOpen: e.target.checked },
            {
              onSuccess: (t) => toast.success(t.isOpen ? "QR ordering is open" : "QR ordering paused"),
              onError: (err) => toast.error(err.message),
            },
          )
        }
      />
      Accept QR orders
    </label>
  )
}
