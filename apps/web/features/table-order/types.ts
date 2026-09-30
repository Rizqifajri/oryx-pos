export type MenuBadge = "chef_pick" | "best_seller" | "new" | "spicy"

export type PublicTenant = {
  id: string
  name: string
  slug: string
  tagline: string | null
  isOpen: boolean
}

export type PublicTable = { id: string; name: string }

/** Response of POST /public/tables/:qrToken/session, cached per table token. */
export type GuestSession = {
  guestToken: string
  sessionId: string
  table: PublicTable
  tenant: PublicTenant
}

export type MenuCategory = { id: string; name: string }

export type MenuItem = {
  id: string
  categoryId: string
  name: string
  description: string
  /** Integer cents. */
  price: number
  imageUrl: string | null
  isAvailable: boolean
  isPopular: boolean
  badge: MenuBadge | null
}

export type PublicMenu = { categories: MenuCategory[]; items: MenuItem[] }

export type OrderStatus = "NEW" | "PROCESSING" | "COMPLETED" | "CANCELED"

export type SessionOrderItem = {
  id: string
  menuId: string
  menuName: string
  imageUrl: string | null
  quantity: number
  price: number
  note: string | null
}

export type SessionOrder = {
  id: string
  sessionId: string
  status: OrderStatus
  totalPrice: number
  note: string | null
  submittedAt: string
  isPaid: boolean
  items: SessionOrderItem[]
}

export type BillPayment = {
  id: string
  status: "pending" | "success" | "failed" | "expired"
  amount: number
  snapToken: string | null
  snapRedirectUrl: string | null
  expiresAt: string
  paymentType: string | null
}

export type Bill = {
  id: string | null
  status: "open" | "locked" | "paid"
  subtotal: number
  taxAmount: number
  serviceAmount: number
  totalAmount: number
  paymentMethod: string | null
  lockedAt: string | null
  paidAt: string | null
  payment: BillPayment | null
}

export type ServiceRequestType = "call_waiter" | "water" | "cutlery" | "bill"

export type SessionView = {
  session: {
    id: string
    status: "open" | "billing" | "closed"
    openedAt: string
    closedAt: string | null
  }
  table: PublicTable | null
  tenant: PublicTenant | null
  orders: SessionOrder[]
  bill: Bill
  /** ISO time each request type can be sent again. */
  serviceCooldowns: Partial<Record<ServiceRequestType, string>>
}

export type SubmitOrderLine = {
  menuId: string
  quantity: number
  note?: string
  unitPrice?: number
}
