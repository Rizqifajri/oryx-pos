import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface StatCardProps {
  title: string
  value: number | string
  description: string
  icon: LucideIcon
  loading?: boolean
  href?: string
}

export function StatCard({ title, value, description, icon: Icon, loading, href }: StatCardProps) {
  const card = (
    <Card size="sm" className={"h-full shadow-sm" + (href ? " transition-colors hover:bg-muted/40" : "")}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-3xl font-bold tracking-tight">{value}</p>
        )}
        <p className="mt-1 truncate text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )

  if (!href) return card
  return (
    <Link href={href} className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {card}
    </Link>
  )
}
