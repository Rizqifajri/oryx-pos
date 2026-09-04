"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PermissionGuard } from "@/components/guards"
import { PERMISSIONS } from "@/constants/permissions"
import { cn } from "@/lib/utils"
import { Plus, Edit, Trash2, Users } from "lucide-react"
import { toast } from "sonner"

import { useTables, useDeleteTable, useUpdateTableStatus } from "../hooks/use-tables"
import { TableFormDialog } from "./table-form-dialog"
import type { Table, TableStatus } from "../types"

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

  // Build filters object conditionally
  const filters = {
    ...(tenantId ? { tenantId } : {}),
    ...(activeTab !== "ALL" ? { status: activeTab } : {}),
  }
  const hasFilters = Object.keys(filters).length > 0

  const { data: tables = [], isLoading } = useTables(hasFilters ? filters : undefined)
  const { mutateAsync: deleteTable, isPending: isDeleting } = useDeleteTable()
  const { mutateAsync: updateStatus } = useUpdateTableStatus()

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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Tables</h2>
        <PermissionGuard permissions={PERMISSIONS.TABLE_CREATE}>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Table
          </Button>
        </PermissionGuard>
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
                  <td className="px-4 py-3 text-right">
                    <Skeleton className="ml-auto h-8 w-24" />
                  </td>
                </tr>
              ))}

            {!isLoading && tables.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
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
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("id-ID", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(table.createdAt))}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
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

      <TableFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        table={editingTable}
        filterTenantId={tenantId}
      />
    </div>
  )
}
