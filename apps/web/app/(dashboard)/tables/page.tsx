import { RequirePermission } from "@/components/guards"
import { PERMISSIONS } from "@/constants/permissions"
import TablesPage from "@/features/table/pages/tables"

export default function Page() {
  return (
    <RequirePermission permissions={PERMISSIONS.TABLE_MANAGE}>
      <TablesPage />
    </RequirePermission>
  )
}
