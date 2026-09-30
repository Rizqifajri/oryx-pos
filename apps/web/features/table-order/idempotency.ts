/**
 * Random Idempotency-Key. `crypto.randomUUID` only exists in secure contexts,
 * and guests may reach a dev/LAN server over plain http, so fall back to
 * getRandomValues (available everywhere).
 */
export function newIdempotencyKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}
