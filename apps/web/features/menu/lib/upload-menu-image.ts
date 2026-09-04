export async function uploadMenuImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)

  const res = await fetch("/api/uploads/menu", {
    method: "POST",
    body: formData,
  })

  const body = (await res.json()) as {
    success: boolean
    data?: { url: string }
    message?: string
  }

  if (!res.ok || !body.success || !body.data?.url) {
    throw new Error(body.message ?? "Failed to upload image")
  }

  return body.data.url
}
