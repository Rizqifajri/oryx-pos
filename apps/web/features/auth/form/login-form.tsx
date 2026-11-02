"use client"

import { useForm } from "react-hook-form"
import { Suspense } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSearchParams } from "next/navigation"
import { CircleAlert, CircleCheck } from "lucide-react"

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
import { PasswordInput } from "../components/password-input"

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
      <FieldSet disabled={isPending} className="gap-6">
        {justRegistered && !error && (
          <p role="status" className="flex items-start gap-2 border border-green-600/30 bg-green-600/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
            <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            Account created. Sign in to continue.
          </p>
        )}

        {error && (
          <p role="alert" className="flex items-start gap-2 border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error.statusCode === 401 ? "Wrong email or password." : error.message}
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
            <PasswordInput
              id="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            <FieldError errors={[errors.password]} />
          </Field>
        </FieldGroup>

        <Button
          type="submit"
          size="lg"
          className="w-full cursor-pointer bg-foreground text-background hover:bg-foreground/90"
          disabled={isPending}
        >
          {isPending ? "Signing in…" : "Sign in"}
        </Button>
      </FieldSet>
    </form>
  )
}

export function LoginForm() {
  return (
    <Suspense fallback={null}>
      <LoginFormInner />
    </Suspense>
  )
}