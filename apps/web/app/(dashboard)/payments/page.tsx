import { RequirePermission } from "@/components/guards"
import { PERMISSIONS } from "@/constants/permissions"
import { PaymentsPage } from "@/features/payment/pages/payments"

export default function Page() {
  return (
    <RequirePermission permissions={PERMISSIONS.TRANSACTION_LIST}>
      <PaymentsPage />
    </RequirePermission>
  )
}
