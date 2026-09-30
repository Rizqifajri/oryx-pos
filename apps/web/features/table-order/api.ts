import axios, { type AxiosError, type AxiosInstance } from "axios"

/**
 * Error shape for the guest API. `code` mirrors the server's machine-readable
 * reason (BILL_LOCKED, ITEM_UNAVAILABLE, …) and `details` its structured data.
 */
export class GuestApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown,
  ) {
    super(message)
  }

  get isNetwork() {
    return this.status === 0
  }
}

type ErrorBody = { message?: string; code?: string; details?: unknown }

/**
 * A separate axios instance for guests: the staff client attaches the staff
 * bearer token and redirects to /login on 401, neither of which may happen on
 * the public table menu. Responses are unwrapped from `{ success, data }`.
 */
export function createGuestClient(getToken: () => string | null): AxiosInstance {
  const instance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    timeout: 15_000,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  })

  instance.interceptors.request.use((config) => {
    const token = getToken()
    if (token) config.headers["X-Guest-Token"] = token
    return config
  })

  instance.interceptors.response.use(
    (response) => response.data?.data,
    (error: AxiosError<ErrorBody>) => {
      if (!error.response) {
        return Promise.reject(
          new GuestApiError("Tidak ada koneksi. Periksa internet lalu coba lagi.", 0),
        )
      }
      const body = error.response.data ?? {}
      return Promise.reject(
        new GuestApiError(
          body.message ?? error.message,
          error.response.status,
          body.code,
          body.details,
        ),
      )
    },
  )

  return instance
}
