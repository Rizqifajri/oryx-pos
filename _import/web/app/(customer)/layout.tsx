import { CartProvider } from "@/features/cart/context/cart-context"

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>
}
