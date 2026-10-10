"use client"

import { useRef } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Copy, ExternalLink, Printer, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { PermissionGuard } from "@/components/guards"
import { PERMISSIONS } from "@/constants/permissions"
import { useRotateTableQr, useTableQr } from "../hooks/use-table-sessions"

/**
 * The table's guest-ordering QR code. The URL carries a random token, not the
 * table id; rotating it invalidates printed codes (seated guests keep going).
 */
export function TableQrDialog({
  tableId,
  onOpenChange,
}: {
  tableId: string | null
  onOpenChange: (open: boolean) => void
}) {
  const { data: qr, isLoading } = useTableQr(tableId)
  const rotate = useRotateTableQr()
  const svgWrapper = useRef<HTMLDivElement>(null)
  const url = qr && typeof window !== "undefined" ? `${window.location.origin}${qr.path}` : ""

  function print() {
    const svg = svgWrapper.current?.innerHTML
    if (!svg || !qr) return
    const win = window.open("", "_blank", "width=480,height=640")
    if (!win) return
    const name = qr.tableName.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)
    win.document.write(`<!doctype html><title>${name}</title>
      <body style="font-family:system-ui,sans-serif;text-align:center;padding:32px">
        <h1 style="margin:0 0 4px">${name}</h1>
        <p style="margin:0 0 24px;color:#555">Pindai untuk melihat menu &amp; memesan</p>
        <div style="width:280px;margin:0 auto">${svg}</div>
      </body>`)
    win.document.close()
    win.focus()
    win.print()
  }

  return (
    <Dialog open={!!tableId} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>QR {qr?.tableName ?? "meja"}</DialogTitle>
          <DialogDescription>Guests scan this to open the menu and order from their phone.</DialogDescription>
        </DialogHeader>

        {isLoading || !qr ? (
          <Skeleton className="mx-auto size-56" />
        ) : (
          <div className="space-y-3">
            <div ref={svgWrapper} className="mx-auto w-fit rounded-lg border bg-white p-3">
              <QRCodeSVG value={url} size={224} marginSize={1} level="M" />
            </div>
            <p className="break-all rounded-md bg-muted px-2 py-1.5 font-mono text-xs text-muted-foreground">{url}</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(url).then(() => toast.success("Link copied"))
                }}
              >
                <Copy className="mr-1 size-4" /> Copy
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1 size-4" /> Open
                </a>
              </Button>
              <Button variant="outline" size="sm" onClick={print}>
                <Printer className="mr-1 size-4" /> Print
              </Button>
            </div>
            <PermissionGuard permissions={[PERMISSIONS.TABLE_UPDATE, PERMISSIONS.TABLE_MANAGE]} requireAll={false}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-destructive hover:text-destructive"
                disabled={rotate.isPending}
                onClick={() => {
                  if (!confirm("Generate a new QR code? Printed codes for this table will stop working.")) return
                  rotate.mutate(qr.tableId, {
                    onSuccess: () => toast.success("New QR code generated — reprint it"),
                    onError: (e) => toast.error(e.message),
                  })
                }}
              >
                <RefreshCw className="mr-1 size-4" /> Rotate QR code
              </Button>
            </PermissionGuard>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
