import { RequirePermission } from "@/components/guards"
import { PERMISSIONS } from "@/constants/permissions"
import { InventoryPage } from "@/features/inventory/pages/inventory"

export default function Page() {
  return (
    <RequirePermission permissions={PERMISSIONS.MENU_MANAGE}>
      <InventoryPage />
    </RequirePermission>
  )
}
