import { useMemo } from "react"

export function usePaymentCalculation(subtotal: number) {
  return useMemo(() => {
    const tax = subtotal * 0.1 // Pajak PB1 10%
    const service = subtotal * 0.05 // Service charge 5%
    const totalPayment = subtotal + tax + service

    return {
      subtotal,
      tax,
      service,
      totalPayment
    }
  }, [subtotal])
}
