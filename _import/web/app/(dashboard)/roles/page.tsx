import { RequirePermission } from "@/components/guards"
import { PERMISSIONS } from "@/constants/permissions"
import { RolesPage } from "@/features/role/pages/roles"

export default function Page() {
  return (
    <RequirePermission 
      permissions={[PERMISSIONS.ROLE_VIEW, PERMISSIONS.ROLE_CREATE]} 
      requireAll={false}
    >
      <RolesPage />
    </RequirePermission>
  )
}
