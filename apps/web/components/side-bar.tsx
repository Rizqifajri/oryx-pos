"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import {
  BookOpen,
  Building2,
  LayoutDashboard,
  Lock,
  LogOut,
  Package,
  ShieldCheck,
  ShoppingCart,
  Monitor,
  User,
  Users,
  LayoutGrid,
} from "lucide-react"

import { getStoredUser, useLogout } from "@/features/auth/hooks/use-auth"
import { useMe } from "@/features/auth/hooks/use-me"
import { useUserPermissions } from "@/features/auth/hooks/use-permissions"
import { filterPermission } from "@/lib/filter-permission"
import { PERMISSIONS, type Permission } from "@/constants/permissions"
import { ConfirmationModal } from "@/components/confirmation-modals"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"

interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  /** Empty = visible to all authenticated dashboard users */
  permissions?: Permission[]
}

interface NavGroup {
  label: string
  /** Which login scopes see this group. Omit = all scopes. */
  scopes?: Array<"GLOBAL" | "TENANT">
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Operations",
    scopes: ["TENANT"],
    items: [
      { title: "POS Kasir", href: "/pos", icon: Monitor, permissions: [PERMISSIONS.ORDER_MANAGE] },
      { title: "Menu", href: "/menu", icon: BookOpen, permissions: [PERMISSIONS.MENU_MANAGE] },
      { title: "Tables", href: "/tables", icon: LayoutGrid, permissions: [PERMISSIONS.TABLE_MANAGE] },
      { title: "Inventory", href: "/inventory", icon: Package, permissions: [PERMISSIONS.MENU_MANAGE] },
      { title: "Order", href: "/order", icon: ShoppingCart, permissions: [PERMISSIONS.ORDER_MANAGE] },
    ],
  },
  {
    label: "Team Management",
    scopes: ["TENANT"],
    items: [
      { title: "Users", href: "/users", icon: Users, permissions: [PERMISSIONS.USER_MANAGE] },
      { title: "Roles", href: "/roles", icon: ShieldCheck, permissions: [PERMISSIONS.ROLE_MANAGE] },
    ],
  },
  {
    label: "Administration",
    scopes: ["GLOBAL"],
    items: [
      { title: "Users", href: "/users", icon: Users, permissions: [PERMISSIONS.USER_MANAGE] },
      { title: "Roles", href: "/roles", icon: ShieldCheck, permissions: [PERMISSIONS.ROLE_MANAGE] },
      { title: "Permissions", href: "/permissions", icon: Lock, permissions: [PERMISSIONS.PERMISSION_MANAGE] },
      { title: "Tenants", href: "/tenants", icon: Building2, permissions: [PERMISSIONS.TENANT_MANAGE] },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const { mutate: logout, isPending } = useLogout()
  const { permissions: userPermissions } = useUserPermissions()
  const { data: meData } = useMe()
  const [userScope, setUserScope] = useState<"GLOBAL" | "TENANT" | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Load user scope from localStorage on mount for initial render (client-side only)
  useEffect(() => {
    const user = getStoredUser()
    setUserScope(user?.scope ?? null)
    setIsMounted(true)
  }, [])

  const allowedGroups = navGroups
    .filter(
      (group) =>
        !group.scopes?.length ||
        userScope === "GLOBAL" ||
        (userScope && group.scopes.includes(userScope)),
    )
    .map((group) => ({
      ...group,
      items: filterPermission(group.items, (item) => {
        if (!item.permissions?.length) return true
        return item.permissions.some((p) => userPermissions.includes(p))
      }),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <>
      <ConfirmationModal
        open={showLogoutModal}
        onOpenChange={setShowLogoutModal}
        onConfirm={() => logout()}
        title="Sign out"
        description="Are you sure you want to sign out?"
        confirmLabel="Sign out"
        isPending={isPending}
      />
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-black text-sidebar-primary-foreground font-bold text-sm">
                    O
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">ORYX</span>
                    <span className="text-xs text-muted-foreground">Dashboard Management</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {allowedGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={
                          pathname === item.href ||
                          (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`))
                        }
                        tooltip={item.title}
                      >
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            {/* User Info Display - Simple, non-clickable */}
            {!isMounted || !meData ? (
              <div className="flex items-center gap-3 px-2 py-2 mx-1 mb-1 rounded-md bg-muted/50">
                <Skeleton className="size-8 rounded-md" />
                <div className="flex flex-col gap-1 overflow-hidden group-data-[collapsible=icon]:hidden">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-2 py-2 mx-1 mb-1 rounded-md bg-muted/50">
                <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-muted">
                  <User className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none overflow-hidden group-data-[collapsible=icon]:hidden">
                  <span className="text-sm font-medium truncate">{meData.name}</span>
                  <span className="text-xs text-muted-foreground truncate">{meData.email}</span>
                </div>
              </div>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setShowLogoutModal(true)}
                tooltip="Logout"
                className="text-destructive hover:text-destructive focus-visible:text-destructive"
              >
                <LogOut />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>
    </>
  )
}
