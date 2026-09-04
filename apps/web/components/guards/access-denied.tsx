"use client"

import { ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface AccessDeniedProps {
  /** Custom message to display. Defaults to generic access denied message. */
  message?: string
  /** Show a back button. Default: true */
  showBackButton?: boolean
}

/**
 * Display an access denied message when user lacks required permissions.
 * Can be used as a fallback in PermissionGuard or as a standalone page.
 */
export function AccessDenied({ 
  message = "You don't have permission to access this resource.", 
  showBackButton = true 
}: AccessDeniedProps) {
  const router = useRouter()

  return (
    <div className="flex h-[400px] w-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <ShieldAlert className="h-12 w-12 text-destructive" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground max-w-md">{message}</p>
      </div>
      {showBackButton && (
        <Button onClick={() => router.back()} variant="outline">
          Go Back
        </Button>
      )}
    </div>
  )
}
