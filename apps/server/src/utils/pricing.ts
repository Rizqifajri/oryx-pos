/**
 * Server-side pricing rules. Tax and service charge are computed here so the
 * amount recorded in a Transaction is always authoritative — the frontend may
 * show an estimate using the same rates, but it is never trusted as input.
 *
 * All amounts are integer cents.
 */
export const TAX_RATE = 0.1; // 10%
export const SERVICE_RATE = 0.05; // 5%

export interface PriceBreakdown {
  subtotal: number;
  taxAmount: number;
  serviceAmount: number;
  totalAmount: number;
}

export const computePriceBreakdown = (subtotal: number): PriceBreakdown => {
  const taxAmount = Math.round(subtotal * TAX_RATE);
  const serviceAmount = Math.round(subtotal * SERVICE_RATE);
  return {
    subtotal,
    taxAmount,
    serviceAmount,
    totalAmount: subtotal + taxAmount + serviceAmount,
  };
};
