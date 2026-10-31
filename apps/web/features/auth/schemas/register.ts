import { z } from "zod"

// ISO 3166-1 alpha-2; display names come from Intl so no country-data dependency.
const COUNTRY_CODES =
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " "
  )

const regionNames = new Intl.DisplayNames(["en"], { type: "region" })

export const COUNTRIES = COUNTRY_CODES.map((code) => ({
  code,
  name: regionNames.of(code) ?? code,
})).sort((a, b) => a.name.localeCompare(b.name))

const countryCodeByName = new Map(
  COUNTRIES.map((c) => [c.name.toLowerCase(), c.code])
)

export const countryCodeOf = (name: string) =>
  countryCodeByName.get(name.trim().toLowerCase())

const stripPhone = (v: string) => v.replace(/[\s-]/g, "")

export const DEFAULT_COUNTRY = regionNames.of("ID") ?? "Indonesia"

export const BUSINESS_TYPES = ["Restaurant", "Cafe"]

// Shared by the schema and the live checklist under the password field.
export const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "One lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { label: "One number", test: (v: string) => /[0-9]/.test(v) },
  { label: "One symbol (~!@#$%^&*)", test: (v: string) => /[~!@#$%^&*]/.test(v) },
]

// shortcut: hardcoded placeholder packages/prices, move to the API when pricing is real.
// Codes must match PLAN_CODES in apps/api/src/modules/auth/auth.schema.ts.
export const PLANS = [
  {
    code: "starter",
    name: "Starter",
    price: "Rp 99.000",
    description: "For a single small outlet getting started.",
    features: ["1 outlet", "Up to 10 tables", "QR menu ordering"],
  },
  {
    code: "pro",
    name: "Pro",
    price: "Rp 249.000",
    description: "Everything a busy restaurant needs.",
    features: ["1 outlet", "Unlimited tables", "Kitchen display", "Split bill"],
    popular: true,
  },
  {
    code: "business",
    name: "Business",
    price: "Rp 499.000",
    description: "For groups running several outlets.",
    features: ["Multiple outlets", "Everything in Pro", "Priority support"],
  },
] as const

const registerFields = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .min(2, "Name must be at least 2 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  // Digits after the fixed +62 prefix; spaces/dashes and a leading 0 are stripped on submit.
  phone: z
    .string()
    .refine(
      (v) => /^0?\d{8,13}$/.test(stripPhone(v)),
      "Enter 8-13 digits, e.g. 812 3456 7890"
    ),
  tenantName: z
    .string()
    .trim()
    .min(1, "Business name is required")
    .min(2, "Business name must be at least 2 characters"),
  address: z
    .string()
    .trim()
    .min(1, "Business address is required")
    .min(5, "Address must be at least 5 characters"),
  businessType: z
    .string()
    .trim()
    .min(1, "Business type is required")
    .max(50, "Business type is too long"),
  password: z
    .string()
    .min(1, "Password is required")
    .refine(
      (v) => PASSWORD_RULES.every((r) => r.test(v)),
      "Password doesn't meet all the requirements below"
    ),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  country: z
    .string()
    .refine((v) => !!countryCodeOf(v), "Pick a country from the list"),
  province: z.string().trim().min(1, "Province is required"),
  city: z.string().trim().min(1, "City is required"),
  plan: z.enum(
    PLANS.map((p) => p.code),
    "Choose a package"
  ),
})

export const registerSchema = registerFields.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords do not match",
    path: ["confirmPassword"],
    // Zod skips object refinements while any field fails; run it as soon as the
    // two password fields are valid so step 1 catches a mismatch.
    when: (payload) =>
      registerFields
        .pick({ password: true, confirmPassword: true })
        .safeParse(payload.value).success,
  }
)

export type RegisterInput = z.infer<typeof registerSchema>
export type RegisterPayload = Omit<RegisterInput, "confirmPassword">

// Fields validated before leaving each step.
export const STEP_FIELDS: (keyof RegisterInput)[][] = [
  [
    "name",
    "email",
    "phone",
    "tenantName",
    "businessType",
    "address",
    "password",
    "confirmPassword",
  ],
  ["country", "province", "city"],
  ["plan"],
]

export const toRegisterPayload = ({
  confirmPassword: _,
  ...input
}: RegisterInput): RegisterPayload => ({
  ...input,
  phone: `+62${stripPhone(input.phone).replace(/^0/, "")}`,
  country: countryCodeOf(input.country)!,
})
