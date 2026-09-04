import { RequirePermission } from "@/components/guards"
import { PERMISSIONS } from "@/constants/permissions"
import { OrdersPage } from "@/features/order/pages/orders"

export default function Page() {
  return (
    <RequirePermission permissions={PERMISSIONS.ORDER_MANAGE}>
      <OrdersPage />
    </RequirePermission>
  )
}
