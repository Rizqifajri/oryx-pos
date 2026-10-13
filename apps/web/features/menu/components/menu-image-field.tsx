"use client"

import { useEffect, useRef, useState } from "react"
import { ImagePlus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { cn } from "@/lib/utils"

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const ACCEPT = ACCEPTED_TYPES.join(",")
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

interface Props {
  existingUrl?: string
  disabled?: boolean
  error?: string
  onChange: (file: File | null) => void
  onError?: (error?: string) => void
}

export function MenuImageField({ existingUrl, disabled, error, onChange, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(existingUrl ?? null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [internalError, setInternalError] = useState<string | null>(null)

  useEffect(() => {
    setPreview(existingUrl ?? null)
    setFileName(null)
    setInternalError(null)
  }, [existingUrl])

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview)
    }
  }, [preview])

  function handleFileChange(file: File | null) {
    if (!file) {
      setInternalError(null)
      onError?.(undefined)
      onChange(null)
      setPreview(existingUrl ?? null)
      setFileName(null)
      return
    }

    // 1. Validation: File format / type (e.g. reject .pdf, text, etc.)
    if (!ACCEPTED_TYPES.includes(file.type)) {
      const msg = "Invalid file type. Only JPEG, PNG, WebP, or GIF images are allowed."
      setInternalError(msg)
      onError?.(msg)
      onChange(null)
      if (inputRef.current) inputRef.current.value = ""
      return
    }

    // 2. Validation: File size (max 5 MB)
    if (file.size > MAX_FILE_SIZE) {
      const msg = "File size exceeds 5 MB limit. Please choose a smaller image."
      setInternalError(msg)
      onError?.(msg)
      onChange(null)
      if (inputRef.current) inputRef.current.value = ""
      return
    }

    // Valid file
    setInternalError(null)
    onError?.(undefined)
    onChange(file)
    setFileName(file.name)
    setPreview(URL.createObjectURL(file))
  }

  function clearSelection() {
    setInternalError(null)
    onError?.(undefined)
    onChange(null)
    setPreview(existingUrl ?? null)
    setFileName(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  const activeError = error || internalError

  return (
    <Field data-invalid={!!activeError}>
      <FieldLabel htmlFor="menu-image">Image</FieldLabel>
      <input
        ref={inputRef}
        id="menu-image"
        type="file"
        accept={ACCEPT}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
      />

      {preview ? (
        <div className="space-y-2">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-input bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Menu preview" className="h-full w-full object-cover" />
          </div>
          {fileName ? (
            <p className="text-xs text-muted-foreground truncate">{fileName}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              Change image
            </Button>
            {fileName ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={clearSelection}
              >
                <X className="size-4" />
                Remove selection
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input px-4 py-8 text-sm transition-colors",
            "hover:border-ring hover:bg-muted/50 disabled:opacity-50",
            activeError && "border-destructive",
          )}
        >
          <ImagePlus className="size-8 text-muted-foreground" />
          <span className="font-medium">Upload image</span>
          <span className="text-xs text-muted-foreground">
            JPEG, PNG, WebP, or GIF — max 5 MB
          </span>
        </button>
      )}

      <FieldError errors={activeError ? [{ message: activeError }] : []} />
    </Field>
  )
}
