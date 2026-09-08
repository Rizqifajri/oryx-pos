import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios"

// ─── Backend Envelope ─────────────────────────────────────────────────────────

/**
 * Every response from this API is wrapped in { success, data }.
 * We unwrap it in the response interceptor so hooks receive `T` directly.
 */
export interface ApiEnvelope<T> {
  success: boolean
  data: T
}

export interface ApiErrorEnvelope {
  success: false
  message: string
  code: number
}

// ─── Normalized Client Error ──────────────────────────────────────────────────

export interface ApiError {
  message: string
  statusCode: number
  errors?: Record<string, string[]>
}

export type ApiResponse<T> = Promise<T>

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL

// ─── Instance ─────────────────────────────────────────────────────────────────

const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  paramsSerializer: { indexes: null },
})

// ─── Request Interceptor ──────────────────────────────────────────────────────

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => Promise.reject(normalizeError(error as AxiosError<ApiErrorEnvelope>))
)

axiosInstance.interceptors.response.use(
  (response: AxiosResponse<ApiEnvelope<unknown>>) => {
    return response.data.data as never
  },
  async (error: AxiosError<ApiErrorEnvelope>) => {
    if (error.response?.status === 401) {
      // Attempt token refresh
      const refreshed = await tryRefreshToken()
      if (refreshed && error.config) {
        error.config.headers.Authorization = `Bearer ${refreshed}`
        return axiosInstance.request(error.config)
      }

      // Refresh failed — clear session and redirect
      clearSession()
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
    }

    return Promise.reject(normalizeError(error))
  }
)


async function tryRefreshToken(): Promise<string | null> {
  try {
    const refreshToken = localStorage.getItem("refresh_token")
    if (!refreshToken) return null

    const res = await axios.post<ApiEnvelope<{ accessToken: string; refreshToken: string }>>(
      `${BASE_URL}/auth/refresh`,
      { refreshToken }
    )

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = res.data.data
    
    // Update both tokens in localStorage
    localStorage.setItem("access_token", newAccessToken)
    localStorage.setItem("refresh_token", newRefreshToken)
    
    // Update access_token cookie for middleware
    setTokenCookie("access_token", newAccessToken)
    
    return newAccessToken
  } catch {
    return null
  }
}

function setTokenCookie(name: string, value: string, days = 7) {
  if (typeof window === "undefined") return
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  const isSecure = window.location.protocol === "https:"
  const secureFlag = isSecure ? "; Secure" : ""
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax${secureFlag}`
}

function deleteTokenCookie(name: string) {
  if (typeof window === "undefined") return
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}

export function clearSession() {
  if (typeof window === "undefined") return
  localStorage.removeItem("access_token")
  localStorage.removeItem("refresh_token")
  localStorage.removeItem("user")
  deleteTokenCookie("access_token")
}


function normalizeError(
  error: AxiosError<ApiErrorEnvelope>
): ApiError {
  if (error.response) {
    return {
      statusCode: error.response.status,
      message: error.response.data?.message ?? error.message,
    }
  }
  if (error.request) {
    return { statusCode: 0, message: "Network error — no response received" }
  }
  return { statusCode: -1, message: error.message }
}

// The response interceptor above unwraps `{ success, data }` and returns `data`
// (typed `never` there), so at runtime these resolve to `T`. Axios's own return
// type still describes the full response shape, so we assert the unwrapped type.
const get = <T>(url: string, config?: AxiosRequestConfig): ApiResponse<T> =>
  axiosInstance.get(url, config) as unknown as Promise<T>

const post = <T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): ApiResponse<T> => axiosInstance.post(url, data, config) as unknown as Promise<T>

const patch = <T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): ApiResponse<T> => axiosInstance.patch(url, data, config) as unknown as Promise<T>

const put = <T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): ApiResponse<T> => axiosInstance.put(url, data, config) as unknown as Promise<T>

const del = <T>(url: string, config?: AxiosRequestConfig): ApiResponse<T> =>
  axiosInstance.delete(url, config) as unknown as Promise<T>

export const api = { get, post, patch, put, delete: del }
export { axiosInstance }