import { mkdir, writeFile } from "fs/promises"
import path from "path"
import { NextRequest, NextResponse } from "next/server"

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "No image file provided" },
        { status: 400 },
      )
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { success: false, message: "Only JPEG, PNG, WebP, or GIF images are allowed" },
        { status: 400 },
      )
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, message: "Image must be 5 MB or smaller" },
        { status: 400 },
      )
    }

    const ext = EXT_BY_TYPE[file.type] ?? ".jpg"
    const filename = `${crypto.randomUUID()}${ext}`
    const uploadDir = path.join(process.cwd(), "public", "uploads", "menus")

    await mkdir(uploadDir, { recursive: true })
    await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()))

    const url = new URL(`/uploads/menus/${filename}`, request.nextUrl.origin).toString()

    return NextResponse.json({ success: true, data: { url } })
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to upload image" },
      { status: 500 },
    )
  }
}
