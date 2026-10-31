"use client"

import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Eye, EyeOff, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field"
import { cn } from "@/lib/utils"

import {
  BUSINESS_TYPES,
  COUNTRIES,
  DEFAULT_COUNTRY,
  PASSWORD_RULES,
  PLANS,
  registerSchema,
  STEP_FIELDS,
  toRegisterPayload,
  type RegisterInput,
} from "../schemas/register"
import { useRegister } from "../hooks/use-auth"

const STEPS = [
  { title: "Account", description: "Tell us about you and your business." },
  { title: "Location", description: "Where is your business located?" },
  { title: "Package", description: "Pick the package that fits your business." },
]

export function RegisterForm() {
  const { mutate: registerUser, isPending, error } = useRegister()
  const [step, setStep] = useState(0)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    trigger,
    control,
    setValue,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { country: DEFAULT_COUNTRY },
  })

  const [password = "", businessType, selectedPlan] = useWatch({
    control,
    name: ["password", "businessType", "plan"],
  })

  const next = async () => {
    if (await trigger(STEP_FIELDS[step], { shouldFocus: true })) setStep(step + 1)
  }

  const onSubmit = (input: RegisterInput) => registerUser(toRegisterPayload(input))

  // Jump back to the first step that still has an error so it is visible.
  const onInvalid = (errs: object) => {
    const first = STEP_FIELDS.findIndex((fields) => fields.some((f) => f in errs))
    if (first !== -1) setStep(first)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="space-y-8">
      <ol className="flex items-center gap-2" aria-label="Registration progress">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex flex-1 items-center gap-2" aria-current={i === step ? "step" : undefined}>
            <button
              type="button"
              disabled={i >= step || isPending}
              onClick={() => setStep(i)}
              className="flex items-center gap-2 text-sm disabled:cursor-default enabled:cursor-pointer"
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center border text-xs font-semibold transition-colors",
                  i < step && "border-foreground bg-foreground text-background",
                  i === step && "border-foreground text-foreground",
                  i > step && "border-border text-muted-foreground"
                )}
              >
                {i < step ? <Check className="size-3.5" aria-hidden /> : i + 1}
              </span>
              <span className={cn("hidden font-medium sm:inline", i > step && "text-muted-foreground")}>
                {s.title}
              </span>
              <span className="sr-only">{i < step ? " (completed)" : ""}</span>
            </button>
            {i < STEPS.length - 1 && (
              <span className={cn("h-px flex-1", i < step ? "bg-foreground" : "bg-border")} aria-hidden />
            )}
          </li>
        ))}
      </ol>

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 className="text-lg font-semibold">{STEPS[step].title}</h2>
        <p className="text-sm text-muted-foreground">{STEPS[step].description}</p>
      </div>

      {error && (
        <p
          role="alert"
          className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error.message}
        </p>
      )}

      <FieldSet disabled={isPending} className="gap-8">
        {step === 0 && (
          <>
            <FieldSet>
              <FieldLegend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Personal details</FieldLegend>
              <FieldGroup>
                <Field data-invalid={!!errors.name}>
                  <FieldLabel htmlFor="name">Full name</FieldLabel>
                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Budi Santoso"
                    aria-invalid={!!errors.name}
                    {...register("name")}
                  />
                  <FieldDescription>Exactly as written on your KTP.</FieldDescription>
                  <FieldError errors={[errors.name]} />
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
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

                  <Field data-invalid={!!errors.phone}>
                    <FieldLabel htmlFor="phone">Phone number</FieldLabel>
                    <div className="flex">
                      <span className="inline-flex h-8 items-center border border-r-0 border-input bg-muted px-2.5 text-sm text-muted-foreground">
                        +62
                      </span>
                      <Input
                        id="phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        placeholder="812 3456 7890"
                        aria-invalid={!!errors.phone}
                        {...register("phone")}
                      />
                    </div>
                    <FieldError errors={[errors.phone]} />
                  </Field>
                </div>
              </FieldGroup>
            </FieldSet>

            <FieldSeparator />

            <FieldSet>
              <FieldLegend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Business</FieldLegend>
              <FieldGroup>
                <Field data-invalid={!!errors.tenantName}>
                  <FieldLabel htmlFor="tenantName">Business name</FieldLabel>
                  <Input
                    id="tenantName"
                    type="text"
                    autoComplete="organization"
                    placeholder="Warung Makan Sederhana"
                    aria-invalid={!!errors.tenantName}
                    {...register("tenantName")}
                  />
                  <FieldError errors={[errors.tenantName]} />
                </Field>

                <Field data-invalid={!!errors.businessType}>
                  <FieldLabel htmlFor="businessType">Business type</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {BUSINESS_TYPES.map((t) => (
                      <Button
                        key={t}
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-pressed={businessType === t}
                        className="cursor-pointer aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background"
                        onClick={() => setValue("businessType", t, { shouldValidate: true })}
                      >
                        {t}
                      </Button>
                    ))}
                  </div>
                  <Input
                    id="businessType"
                    type="text"
                    placeholder="Or type your own, e.g. Bakery"
                    aria-invalid={!!errors.businessType}
                    {...register("businessType")}
                  />
                  <FieldError errors={[errors.businessType]} />
                </Field>

                <Field data-invalid={!!errors.address}>
                  <FieldLabel htmlFor="address">Business address</FieldLabel>
                  <Input
                    id="address"
                    type="text"
                    autoComplete="street-address"
                    placeholder="Jl. Sudirman No. 1"
                    aria-invalid={!!errors.address}
                    {...register("address")}
                  />
                  <FieldError errors={[errors.address]} />
                </Field>
              </FieldGroup>
            </FieldSet>

            <FieldSeparator />

            <FieldSet>
              <FieldLegend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Security</FieldLegend>
              <FieldGroup>
                <Field data-invalid={!!errors.password}>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className="pr-9"
                      aria-invalid={!!errors.password}
                      aria-describedby="password-rules"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 flex w-9 cursor-pointer items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <ul id="password-rules" className="grid gap-1 text-xs sm:grid-cols-2">
                    {PASSWORD_RULES.map((rule) => {
                      const met = rule.test(password)
                      return (
                        <li
                          key={rule.label}
                          className={cn(
                            "flex items-center gap-1.5",
                            met ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          {met ? (
                            <Check className="size-3.5 text-green-600" aria-hidden />
                          ) : (
                            <X className="size-3.5" aria-hidden />
                          )}
                          {rule.label}
                          <span className="sr-only">{met ? "(met)" : "(not met)"}</span>
                        </li>
                      )
                    })}
                  </ul>
                  <FieldError errors={[errors.password]} />
                </Field>

                <Field data-invalid={!!errors.confirmPassword}>
                  <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    aria-invalid={!!errors.confirmPassword}
                    {...register("confirmPassword")}
                  />
                  <FieldError errors={[errors.confirmPassword]} />
                </Field>
              </FieldGroup>
            </FieldSet>
          </>
        )}

        {step === 1 && (
          <FieldGroup>
            <Field data-invalid={!!errors.country}>
              <FieldLabel htmlFor="country">Country</FieldLabel>
              <Input
                id="country"
                type="text"
                list="countries"
                autoComplete="country-name"
                placeholder="Start typing to search"
                aria-invalid={!!errors.country}
                {...register("country")}
              />
              <datalist id="countries">
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.name} />
                ))}
              </datalist>
              <FieldError errors={[errors.country]} />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field data-invalid={!!errors.province}>
                <FieldLabel htmlFor="province">Province</FieldLabel>
                <Input
                  id="province"
                  type="text"
                  autoComplete="address-level1"
                  placeholder="DKI Jakarta"
                  aria-invalid={!!errors.province}
                  {...register("province")}
                />
                <FieldError errors={[errors.province]} />
              </Field>

              <Field data-invalid={!!errors.city}>
                <FieldLabel htmlFor="city">City</FieldLabel>
                <Input
                  id="city"
                  type="text"
                  autoComplete="address-level2"
                  placeholder="Jakarta Selatan"
                  aria-invalid={!!errors.city}
                  {...register("city")}
                />
                <FieldError errors={[errors.city]} />
              </Field>
            </div>
          </FieldGroup>
        )}

        {step === 2 && (
          <FieldSet>
            <FieldLegend className="sr-only">Package</FieldLegend>
            <div className="grid gap-3">
              {PLANS.map((plan) => {
                const selected = selectedPlan === plan.code
                return (
                  <label
                    key={plan.code}
                    className={cn(
                      "relative flex cursor-pointer gap-4 border p-4 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                      selected ? "border-foreground bg-muted" : "border-border hover:border-foreground/40"
                    )}
                  >
                    <input type="radio" value={plan.code} className="sr-only" {...register("plan")} />
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center border",
                        selected ? "border-foreground bg-foreground text-background" : "border-input"
                      )}
                      aria-hidden
                    >
                      {selected && <Check className="size-3.5" />}
                    </span>
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <span className="flex items-center gap-2 font-semibold">
                          {plan.name}
                          {"popular" in plan && (
                            <span className="bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                              Most popular
                            </span>
                          )}
                        </span>
                        <span className="text-sm">
                          <span className="font-semibold">{plan.price}</span>
                          <span className="text-muted-foreground"> / month</span>
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                      <ul className="grid gap-1 text-sm sm:grid-cols-2">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-1.5">
                            <Check className="size-3.5 text-green-600" aria-hidden />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </label>
                )
              })}
            </div>
            <FieldError errors={[errors.plan]} />
          </FieldSet>
        )}

        <div className="flex gap-3">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1 cursor-pointer"
              onClick={() => setStep(step - 1)}
            >
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              size="lg"
              className="flex-1 cursor-pointer bg-foreground text-background hover:bg-foreground/90"
              onClick={next}
            >
              Continue
            </Button>
          ) : (
            <Button
              type="submit"
              size="lg"
              className="flex-1 cursor-pointer bg-foreground text-background hover:bg-foreground/90"
              disabled={isPending}
            >
              {isPending ? "Creating account…" : "Create account"}
            </Button>
          )}
        </div>
      </FieldSet>
    </form>
  )
}
