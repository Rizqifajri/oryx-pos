"use client"

import { useForm } from "react-hook-form"
import { Suspense } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field"

import { loginSchema, type LoginInput } from "../schemas/login"
import { useLogin } from "../hooks/use-auth"

function LoginFormInner() {
  const searchParams = useSearchParams()
  const justRegistered = searchParams.get("registered") === "true"

  const { mutate: login, isPending, error } = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = (data: LoginInput) => login(data)

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldSet disabled={isPending}>
        {justRegistered && (
          <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            Account created — sign in to continue.
          </p>
        )}

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error.message}
          </p>
        )}

        <FieldGroup>
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            <FieldError errors={[errors.email]} />
          </Field>

          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            <FieldError errors={[errors.password]} />
          </Field>
        </FieldGroup>

        <div className="flex justify-end">
          <a
            href="/auth/forgot-password"
            className="text-xs text-zinc-500 hover:text-zinc-600 hover:underline"
          >
            Forgot password?
          </a>
        </div>

        <Button
          type="submit"
          size="lg"
          className="mt-6 w-full bg-black text-white hover:bg-black/90 cursor-pointer"
          disabled={isPending}
        >
          {isPending ? "Signing in…" : "Sign in"}
        </Button>

        <p className="mt-4 text-center text-xs text-zinc-500">
          Don’t have an account?{" "}
          <a
            href="/register"
            className="font-medium text-black hover:underline"
          >
            Sign up
          </a>
        </p>
      </FieldSet>
    </form>
  )
}

export function LoginForm() {
  return (
    <Suspense fallback={<FieldSet disabled><div className="h-" /></FieldSet>}>
      <LoginFormInner />
    </Suspense>
  )
}