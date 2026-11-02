import Image from "next/image"
import { Check } from "lucide-react"
import oryxLogo from "@/app/assets/logo/logo.jpeg"
import { cn } from "@/lib/utils"

const HIGHLIGHTS = [
  "QR menu ordering straight from the table",
  "Kitchen display and live order tracking",
  "Split bills and payments in one place",
]

// Split layout shared by the login and register pages: brand panel on desktop, logo on top on mobile.
export function AuthShell({
  title,
  description,
  footer,
  className,
  children,
}: {
  title: string
  description: string
  footer: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-[2fr_3fr]">
      <aside className="hidden flex-col justify-between border-r bg-background p-10 lg:sticky lg:top-0 lg:flex lg:h-screen">
        {/* JPEG has a white background; invert keeps it from showing as a white box in dark mode. */}
        <Image src={oryxLogo} alt="Oryx" priority className="w-40 dark:invert" />
        <div className="space-y-6">
          <div className="h-1 w-12 bg-primary" aria-hidden />
          <h2 className="text-3xl font-semibold tracking-tight text-balance">
            Run your restaurant from one simple point of sale.
          </h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {HIGHLIGHTS.map((h) => (
              <li key={h} className="flex items-center gap-2">
                <Check className="size-4 text-foreground" aria-hidden />
                {h}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Oryx</p>
      </aside>

      <section className="flex min-w-0 justify-center px-4 py-10 sm:px-8 lg:items-center lg:py-16">
        <div className={cn("w-full max-w-xl space-y-8", className)}>
          <Image src={oryxLogo} alt="Oryx" priority className="w-28 dark:invert lg:hidden" />

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          {children}

          <p className="text-center text-sm text-muted-foreground">{footer}</p>
        </div>
      </section>
    </div>
  )
}
