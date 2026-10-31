import Link from "next/link"
import Image from "next/image"
import { Check } from "lucide-react"
import { RegisterForm } from "@/features/auth/form/register-form"
import oryxLogo from "@/app/assets/logo/logo.jpeg"

export const metadata = {
  title: "Create account — RestaurantOS",
}

const HIGHLIGHTS = [
  "QR menu ordering straight from the table",
  "Kitchen display and live order tracking",
  "Split bills and payments in one place",
]

export default function Register() {
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
        <div className="w-full max-w-xl space-y-8">
          <Image src={oryxLogo} alt="Oryx" priority className="w-28 dark:invert lg:hidden" />

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
            <p className="text-sm text-muted-foreground">
              Set up your business in three quick steps.
            </p>
          </div>

          <RegisterForm />

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
