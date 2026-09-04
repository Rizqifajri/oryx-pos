import { RequirePermission } from "@/components/guards"
import { PERMISSIONS } from "@/constants/permissions"
import { UsersPage } from "@/features/user/pages/users"

export default function Page() {
  return (
    <RequirePermission
      permissions={[PERMISSIONS.USER_VIEW, PERMISSIONS.USER_MANAGE]}
      requireAll={false}
    >
      <UsersPage />
    </RequirePermission>
  )
}
