"use client"

import { useEffect, useRef, useState } from "react"
import { ImagePlus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { cn } from "@/lib/utils"

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif"

interface Props {
  existingUrl?: string
  disabled?: boolean
  error?: string
  onChange: (file: File | null) => void
}

export function MenuImageField({ existingUrl, disabled, error, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(existingUrl ?? null)
  const [fileName, setFileName] = useState<string | null>(null)

  useEffect(() => {
    setPreview(existingUrl ?? null)
    setFileName(null)
  }, [existingUrl])

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview)
    }
  }, [preview])

  function handleFileChange(file: File | null) {
    onChange(file)
    if (!file) {
      setPreview(existingUrl ?? null)
      setFileName(null)
      return
    }
    setFileName(file.name)
    setPreview(URL.createObjectURL(file))
  }

  function clearSelection() {
    onChange(null)
    setPreview(existingUrl ?? null)
    setFileName(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <Field data-invalid={!!error}>
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
            error && "border-destructive",
          )}
        >
          <ImagePlus className="size-8 text-muted-foreground" />
          <span className="font-medium">Upload image</span>
          <span className="text-xs text-muted-foreground">
            JPEG, PNG, WebP, or GIF — max 5 MB
          </span>
        </button>
      )}

      <FieldError errors={error ? [{ message: error }] : []} />
    </Field>
  )
}
