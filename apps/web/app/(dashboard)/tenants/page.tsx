import { RequirePermission } from "@/components/guards"
import { PERMISSIONS } from "@/constants/permissions"
import { TenantPage } from "@/features/tenant/pages/tenant"

export default function Page() {
  return (
    <RequirePermission permissions={PERMISSIONS.TENANT_MANAGE}>
      <TenantPage />
    </RequirePermission>
  )
}
