"use client"

import { useState } from "react"
import { CheckCircle2, MessageSquareHeart, Send } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSubmitGuestFeedback } from "@/features/feedback/hooks/use-feedbacks"

// Emoticon criteria: 1 (Very sad) -> 5 (Very happy)
export const EMOJI_OPTIONS = [
  { rating: 1, emoji: "😡", label: "Sangat Buruk" },
  { rating: 2, emoji: "🙁", label: "Kurang Puas" },
  { rating: 3, emoji: "😐", label: "Biasa Saja" },
  { rating: 4, emoji: "🙂", label: "Puas" },
  { rating: 5, emoji: "😍", label: "Luar Biasa" },
]

interface FeedbackCardProps {
  orderItems?: { menuId: string; menuName: string }[]
  className?: string
}

export function FeedbackCard({ orderItems = [], className }: FeedbackCardProps) {
  const [overallRating, setOverallRating] = useState<number | null>(null)
  const [comment, setComment] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [menuRatings, setMenuRatings] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState(false)

  const { mutateAsync: submitFeedback, isPending } = useSubmitGuestFeedback()

  // Distinct menu items by menuId
  const uniqueItems = Array.from(
    new Map(orderItems.map((item) => [item.menuId, item])).values()
  )

  function handleMenuRating(menuId: string, rating: number) {
    setMenuRatings((prev) => ({
      ...prev,
      [menuId]: rating,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!overallRating) {
      toast.error("Silakan pilih salah satu emoticon kepuasan!")
      return
    }

    try {
      const itemsPayload = Object.entries(menuRatings).map(([menuId, rating]) => ({
        menuId,
        rating,
      }))

      await submitFeedback({
        overallRating,
        comment: comment.trim() || undefined,
        customerName: customerName.trim() || undefined,
        items: itemsPayload,
      })

      setSubmitted(true)
      toast.success("Terima kasih atas ulasan berharga Anda!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengirim ulasan")
    }
  }

  if (submitted) {
    return (
      <section className={cn("rounded-[14px] bg-pm-surface p-5 text-center shadow-pm-card", className)}>
        <CheckCircle2 className="mx-auto size-9 text-green-600" />
        <h3 className="mt-2 text-[16px] font-bold text-pm-ink">Terima kasih atas ulasannya!</h3>
        <p className="mt-1 text-[13px] text-pm-muted">
          Feedback Anda sangat berharga bagi kami untuk terus meningkatkan cita rasa dan pelayanan.
        </p>
      </section>
    )
  }

  return (
    <section className={cn("rounded-[14px] border border-border bg-pm-surface p-4 text-[13px] shadow-pm-card", className)}>
      <header className="mb-3 flex items-center gap-2">
        <div className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
          <MessageSquareHeart className="size-4" />
        </div>
        <div>
          <h3 className="text-[14px] font-bold text-pm-ink">Sudah mencicipi hidangan kami?</h3>
          <p className="text-[12px] text-pm-muted">Bagikan pengalaman makan Anda di meja ini</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Overall Emoticon Selector */}
        <div>
          <label className="block text-[12px] font-medium text-muted-foreground mb-2">
            Bagaimana kepuasan Anda secara keseluruhan?
          </label>
          <div className="flex justify-between items-center px-1">
            {EMOJI_OPTIONS.map((item) => {
              const isSelected = overallRating === item.rating
              return (
                <button
                  key={item.rating}
                  type="button"
                  onClick={() => setOverallRating(item.rating)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
                    isSelected
                      ? "scale-115 bg-primary/10 ring-2 ring-primary shadow-sm"
                      : "hover:bg-muted/50 opacity-75 hover:opacity-100"
                  )}
                >
                  <span className="text-2xl select-none" role="img" aria-label={item.label}>
                    {item.emoji}
                  </span>
                  <span className={cn("text-[10px]", isSelected ? "font-bold text-primary" : "text-muted-foreground")}>
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Menu Items Emoticon Rating (If items exist) */}
        {uniqueItems.length > 0 && (
          <div className="space-y-2.5 rounded-lg bg-muted/30 p-3">
            <label className="block text-[12px] font-medium text-muted-foreground">
              Rating rasa per menu yang dipesan (opsional):
            </label>
            <div className="space-y-2">
              {uniqueItems.map((item) => (
                <div key={item.menuId} className="flex items-center justify-between gap-2 border-b border-border/50 pb-2 last:border-0 last:pb-0">
                  <span className="truncate text-[12px] font-medium text-foreground">{item.menuName}</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const selected = menuRatings[item.menuId] === star
                      const emoji = EMOJI_OPTIONS.find((e) => e.rating === star)?.emoji ?? "⭐"
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleMenuRating(item.menuId, star)}
                          className={cn(
                            "rounded-md p-1 text-sm transition-transform",
                            selected ? "scale-120 bg-primary/15" : "opacity-40 hover:opacity-100"
                          )}
                          title={EMOJI_OPTIONS.find((e) => e.rating === star)?.label}
                        >
                          {emoji}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer Name & Comment */}
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Nama Anda (opsional)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus-visible:border-ring"
          />
          <textarea
            placeholder="Ada kritik atau saran untuk dapur & pelayanan kami? (opsional)"
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full rounded-lg border border-input bg-background p-2.5 text-xs outline-none focus-visible:border-ring"
          />
        </div>

        <Button type="submit" disabled={isPending || !overallRating} className="w-full h-10 text-xs font-bold gap-1.5">
          <Send className="size-3.5" />
          {isPending ? "Mengirim..." : "Kirim Ulasan"}
        </Button>
      </form>
    </section>
  )
}

