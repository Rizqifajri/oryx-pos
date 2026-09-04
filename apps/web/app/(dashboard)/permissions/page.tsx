import { RequirePermission } from "@/components/guards"
import { PERMISSIONS } from "@/constants/permissions"
import { PermissionsPage } from "@/features/permission/pages/permissions"

export default function Page() {
  return (
    <RequirePermission permissions={PERMISSIONS.PERMISSION_MANAGE}>
      <PermissionsPage />
    </RequirePermission>
  )
}
