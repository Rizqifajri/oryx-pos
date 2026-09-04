export type PublicTable = {
  id: string
  name: string
  capacity: number
}

export type PublicCategory = {
  id: string
  tenantId: string
  name: string
  createdAt: string
}

export type PublicMenu = {
  id: string
  tenantId: string
  categoryId: string
  name: string
  description: string
  price: number
  imageUrl: string
  isAvailable: boolean
  createdAt: string
}

export type PublicMenuResponse = {
  table: PublicTable
  categories: PublicCategory[]
  menus: PublicMenu[]
}

export type CreatePublicOrderPayload = {
  tableId: string | null
  items: { menuId: string; quantity: number }[]
  customerName?: string
  customerPhone?: string
  customerEmail?: string
}
