export interface CartItem {
  menuId: string
  name: string
  price: number
  quantity: number
  /** Kitchen note for this line, e.g. "no chili". */
  note?: string
}
