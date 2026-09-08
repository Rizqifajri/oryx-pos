const API_BASE = process.env.NEXT_PUBLIC_API_URL

/**
 * Uploads a menu image through the backend, which stores it in Cloudflare R2
 * and returns the public URL. The file is streamed straight to the API as
 * multipart/form-data — it never touches the web server or local disk.
 */
export async function uploadMenuImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null

  const res = await fetch(`${API_BASE}/uploads/menu`, {
    method: "POST",
    // Do NOT set Content-Type — the browser adds the multipart boundary.
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  })

  const body = (await res.json().catch(() => null)) as {
    success: boolean
    data?: { url: string }
    message?: string
  } | null

  if (!res.ok || !body?.success || !body.data?.url) {
    throw new Error(body?.message ?? "Failed to upload image")
  }

  return body.data.url
}
