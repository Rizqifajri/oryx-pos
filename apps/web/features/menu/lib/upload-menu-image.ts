const API_BASE = process.env.NEXT_PUBLIC_API_URL

/**
 * Uploads a menu image using a presigned URL: the backend hands out a short-lived
 * PUT URL for Cloudflare R2, and the browser uploads the file straight to R2.
 * The file never passes through the web server or the API. Returns the public URL.
 */
export async function uploadMenuImage(file: File): Promise<string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null

  const presignRes = await fetch(`${API_BASE}/uploads/menu`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ contentType: file.type, size: file.size }),
  })

  const presignBody = (await presignRes.json().catch(() => null)) as {
    success: boolean
    data?: { uploadUrl: string; publicUrl: string }
    message?: string
  } | null

  if (
    !presignRes.ok ||
    !presignBody?.success ||
    !presignBody.data?.uploadUrl ||
    !presignBody.data?.publicUrl
  ) {
    throw new Error(presignBody?.message ?? "Failed to prepare image upload")
  }

  const { uploadUrl, publicUrl } = presignBody.data

  // Content-Type must match what the backend signed, or R2 rejects the PUT.
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  })

  if (!uploadRes.ok) {
    throw new Error("Failed to upload image")
  }

  return publicUrl
}
