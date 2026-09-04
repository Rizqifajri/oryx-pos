import { RequirePermission } from "@/components/guards"
import { PERMISSIONS } from "@/constants/permissions"
import { MenuPage } from "@/features/menu/pages/menu"

export default function Page() {
  return (
    <RequirePermission permissions={PERMISSIONS.MENU_MANAGE}>
      <MenuPage />
    </RequirePermission>
  )
}
