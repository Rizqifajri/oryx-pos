"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field"

import { registerSchema, type RegisterInput } from "../schemas/register"
import { useRegister } from "../hooks/use-auth"

export function RegisterForm() {
  const { mutate: registerUser, isPending, error } = useRegister()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  // Strip confirmPassword before sending — it's a UI-only validation field
  const onSubmit = ({ confirmPassword: _, ...payload }: RegisterInput) => {
    registerUser(payload)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldSet disabled={isPending}>
        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error.message}
          </p>
        )}

        <FieldGroup>
          {/* maps to API: name */}
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="name">Full name</FieldLabel>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="John Doe"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            <FieldError errors={[errors.name]} />
          </Field>

          {/* maps to API: tenantName */}
          <Field data-invalid={!!errors.tenantName}>
            <FieldLabel htmlFor="tenantName">Restaurant name</FieldLabel>
            <Input
              id="tenantName"
              type="text"
              placeholder="My Restaurant"
              aria-invalid={!!errors.tenantName}
              {...register("tenantName")}
            />
            <FieldError errors={[errors.tenantName]} />
          </Field>

          {/* maps to API: email */}
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

          {/* maps to API: password */}
          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="Min. 8 chars, 1 uppercase, 1 number"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            <FieldError errors={[errors.password]} />
          </Field>

          {/* UI-only — stripped before API call */}
          <Field data-invalid={!!errors.confirmPassword}>
            <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              aria-invalid={!!errors.confirmPassword}
              {...register("confirmPassword")}
            />
            <FieldError errors={[errors.confirmPassword]} />
          </Field>
        </FieldGroup>

        <Button
          type="submit"
          size="lg"
          className="mt-6 w-full bg-black text-white hover:bg-black/90 cursor-pointer"
          disabled={isPending}
        >
          {isPending ? "Creating account…" : "Create account"}
        </Button>
      </FieldSet>
    </form>
  )
}