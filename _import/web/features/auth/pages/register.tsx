import Link from "next/link"
import { RegisterForm } from "@/features/auth/form/register-form"
import Image from "next/image"
import oryxLogo from "@/app/assets/logo/logo.jpeg"

export const metadata = {
  title: "Create account — RestaurantOS",
}

export default function Register() {
  return (
    <div className="flex min-h-screen items-center justify-center gap-24">
      <Image src={oryxLogo} alt="oryx-apps" width={500} height={500} className="w-full" />
      <div className="w-full space-y-6 p-6">
        <div className="flex flex-col items-center justify-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Get your restaurant set up in under a minute
          </p>
        </div>

        <RegisterForm />

        <p className="text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-black hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}