import Link from "next/link"
import { AuthShell } from "@/features/auth/components/auth-shell"
import { RegisterForm } from "@/features/auth/form/register-form"

export const metadata = {
  title: "Create account — RestaurantOS",
}

export default function Register() {
  return (
    <AuthShell
      title="Create your account"
      description="Set up your business in three quick steps."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  )
}
