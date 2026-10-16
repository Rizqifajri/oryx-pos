"use client"

import { useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  MessageSquareHeart,
  Star,
  UtensilsCrossed,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDateTime } from "@/lib/format"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  useFeedbacks,
  useFeedbackSummary,
} from "@/features/feedback/hooks/use-feedbacks"
import { EMOJI_OPTIONS } from "@/features/feedback/components/feedback-card"

interface FeedbackSectionProps {
  tenantId?: string | null
}

const EMOJI_MAP: Record<number, { emoji: string; label: string; color: string; badgeBg: string }> = {
  1: { emoji: "😡", label: "Sangat Buruk", color: "text-red-500", badgeBg: "bg-red-50 text-red-700 border-red-200" },
  2: { emoji: "🙁", label: "Kurang Puas", color: "text-orange-500", badgeBg: "bg-orange-50 text-orange-700 border-orange-200" },
  3: { emoji: "😐", label: "Biasa Saja", color: "text-amber-500", badgeBg: "bg-amber-50 text-amber-700 border-amber-200" },
  4: { emoji: "🙂", label: "Puas", color: "text-lime-500", badgeBg: "bg-lime-50 text-lime-700 border-lime-200" },
  5: { emoji: "😍", label: "Luar Biasa", color: "text-green-500", badgeBg: "bg-green-50 text-green-700 border-green-200" },
}

export function FeedbackSection({ tenantId }: FeedbackSectionProps) {
  const [selectedRating, setSelectedRating] = useState<number | undefined>(undefined)
  const [page, setPage] = useState(1)
  const limit = 10

  const resolvedTenantId = tenantId ?? undefined

  const { data: summary, isLoading: isSummaryLoading } = useFeedbackSummary(resolvedTenantId)
  const { data: feedbacksData, isLoading: isListLoading } = useFeedbacks({
    tenantId: resolvedTenantId,
    overallRating: selectedRating,
    page,
    limit,
  })

  const totalReviews = summary?.totalReviews ?? 0
  const avgRating = summary?.averageRating ?? 0

  // Calculate rounded average emoji
  const roundedRating = Math.max(1, Math.min(5, Math.round(avgRating || 5)))
  const avgEmoji = EMOJI_MAP[roundedRating] || EMOJI_MAP[5]

  const items = feedbacksData?.items ?? []
  const pagination = feedbacksData?.pagination

  return (
    <div className="space-y-6">
      {/* ─── Summary Metrics Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Overall Average Rating */}
        <div className="bg-card rounded-xl border p-5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-sm font-medium">
            <span>Overall Score</span>
            <MessageSquareHeart className="w-4 h-4 text-primary" />
          </div>

          {isSummaryLoading ? (
            <div className="py-4 space-y-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-4">
              <div className="text-4xl p-2 rounded-2xl bg-muted/60 flex items-center justify-center">
                {avgEmoji.emoji}
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold tracking-tight">
                    {avgRating > 0 ? avgRating.toFixed(1) : "0.0"}
                  </span>
                  <span className="text-muted-foreground font-medium text-sm">/ 5.0</span>
                </div>
                <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                  {totalReviews > 0 ? avgEmoji.label : "Belum ada ulasan"}
                </p>
              </div>
            </div>
          )}

          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex justify-between items-center">
            <span>Total Ulasan</span>
            <span className="font-semibold text-foreground">{totalReviews} respon</span>
          </div>
        </div>

        {/* Card 2: Rating Distribution Breakdown */}
        <div className="bg-card rounded-xl border p-5 md:col-span-2 shadow-xs">
          <div className="text-muted-foreground text-sm font-medium mb-3 flex items-center justify-between">
            <span>Distribusi Emoticon Kepuasan</span>
            <span className="text-xs text-muted-foreground">Klik untuk filter</span>
          </div>

          {isSummaryLoading ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((r) => {
                const opt = EMOJI_MAP[r]
                const item = summary?.distribution?.find((d) => d.rating === r)
                const count = item?.count ?? 0
                const percent = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0
                const isSelected = selectedRating === r

                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setSelectedRating(isSelected ? undefined : r)
                      setPage(1)
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 text-xs rounded-lg px-2 py-1.5 transition-colors text-left",
                      isSelected
                        ? "bg-primary/10 ring-1 ring-primary/40 font-semibold"
                        : "hover:bg-muted/60"
                    )}
                  >
                    <span className="text-base select-none">{opt.emoji}</span>
                    <span className="w-20 truncate text-foreground font-medium">{opt.label}</span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          r >= 4 ? "bg-emerald-500" : r === 3 ? "bg-amber-500" : "bg-red-500"
                        )}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-muted-foreground tabular-nums">
                      {count} ({percent}%)
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Top & Bottom Rated Menu Insights ────────────────────────── */}
      {summary?.menuRatings && summary.menuRatings.length > 0 && (
        <div className="bg-card rounded-xl border p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4 text-foreground font-semibold text-sm">
            <UtensilsCrossed className="w-4 h-4 text-primary" />
            <span>Performa Rating Menu</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {summary.menuRatings.slice(0, 6).map((menu) => {
              const mRound = Math.max(1, Math.min(5, Math.round(menu.avgRating)))
              const emojiItem = EMOJI_MAP[mRound]
              return (
                <div
                  key={menu.menuId}
                  className="flex items-center justify-between p-3 rounded-lg border bg-background/50 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-sm font-medium truncate text-foreground">{menu.menuName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {menu.totalRatings} ulasan dinilai
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 bg-muted/60 px-2 py-1 rounded-md">
                    <span className="text-base select-none">{emojiItem?.emoji}</span>
                    <span className="text-xs font-bold text-foreground">
                      {menu.avgRating.toFixed(1)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── Customer Feedback Feed ─────────────────────────────────── */}
      <div className="bg-card rounded-xl border shadow-xs overflow-hidden">
        {/* Header & Filter */}
        <div className="p-4 border-b flex flex-wrap items-center justify-between gap-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground text-sm">Daftar Feedback Pelanggan</h3>
            {selectedRating && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                Filter: {EMOJI_MAP[selectedRating]?.emoji} {EMOJI_MAP[selectedRating]?.label}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRating(undefined)
                    setPage(1)
                  }}
                  className="hover:text-destructive font-bold ml-1"
                >
                  ×
                </button>
              </span>
            )}
          </div>

          {/* Quick Filter buttons */}
          <div className="flex items-center gap-1 overflow-x-auto">
            <Button
              variant={selectedRating === undefined ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setSelectedRating(undefined)
                setPage(1)
              }}
            >
              Semua
            </Button>
            {EMOJI_OPTIONS.map((item) => (
              <Button
                key={item.rating}
                variant={selectedRating === item.rating ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs px-2.5 gap-1"
                onClick={() => {
                  setSelectedRating(selectedRating === item.rating ? undefined : item.rating)
                  setPage(1)
                }}
              >
                <span>{item.emoji}</span>
                <span className="hidden sm:inline">{item.rating}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* List Content */}
        <div className="divide-y">
          {isListLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <MessageSquareHeart className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-medium">Belum ada feedback yang sesuai</p>
              <p className="text-xs mt-1">Ulasan pelanggan yang masuk akan tampil otomatis di sini.</p>
            </div>
          ) : (
            items.map((fb) => {
              const emojiConfig = EMOJI_MAP[fb.overallRating] || EMOJI_MAP[5]
              return (
                <div key={fb.id} className="p-5 hover:bg-muted/20 transition-colors space-y-3">
                  {/* Top row: Table/Guest info & Overall Emoji */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl p-1.5 rounded-xl bg-muted/60 select-none">
                        {emojiConfig.emoji}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">
                            {fb.customerName || "Pelanggan Tanpa Nama"}
                          </span>
                          {fb.tableName && (
                            <span className="text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium">
                              Meja {fb.tableName}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDateTime(fb.createdAt)}
                        </p>
                      </div>
                    </div>

                    <span
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-full border font-semibold",
                        emojiConfig.badgeBg
                      )}
                    >
                      {emojiConfig.label} ({fb.overallRating}/5)
                    </span>
                  </div>

                  {/* Customer Review Comment */}
                  {fb.comment && (
                    <div className="text-sm bg-muted/40 p-3 rounded-lg text-foreground border border-muted/80">
                      "{fb.comment}"
                    </div>
                  )}

                  {/* Itemized Menu Ratings */}
                  {fb.items && fb.items.length > 0 && (
                    <div className="pt-1">
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                        <UtensilsCrossed className="w-3 h-3" />
                        Rating Menu Spesifik:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {fb.items.map((menuItem) => {
                          const mEmoji = EMOJI_MAP[menuItem.rating]
                          return (
                            <div
                              key={menuItem.id}
                              className="inline-flex items-center gap-1.5 text-xs bg-background border rounded-md px-2.5 py-1 text-foreground"
                            >
                              <span className="select-none">{mEmoji?.emoji}</span>
                              <span className="font-medium">{menuItem.menuName}</span>
                              <span className="text-muted-foreground font-semibold">
                                ({menuItem.rating}/5)
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* ─── Pagination Footer ─────────────────────────────────────── */}
        {pagination && pagination.totalPages > 1 && (
          <div className="p-4 border-t bg-muted/10 flex items-center justify-between text-xs text-muted-foreground">
            <div>
              Halaman <span className="font-semibold text-foreground">{pagination.page}</span> dari{" "}
              <span className="font-semibold text-foreground">{pagination.totalPages}</span> ({pagination.total} total)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Selanjutnya
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

