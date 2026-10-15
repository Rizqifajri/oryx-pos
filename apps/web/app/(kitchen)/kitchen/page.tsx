import { RequirePermission } from "@/components/guards"
import { PERMISSIONS } from "@/constants/permissions"
import { KitchenBoard } from "@/features/kitchen/pages/kitchen-board"

// Full-screen board for the kitchen TV — deliberately outside the dashboard
// layout so there is no sidebar.
export default function Page() {
  return (
    <RequirePermission permissions={PERMISSIONS.ORDER_LIST}>
      <KitchenBoard />
    </RequirePermission>
  )
}
