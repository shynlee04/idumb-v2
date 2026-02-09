/**
 * Inline Editor — Edit artifacts directly in the dashboard (md, json, yaml, xml only)
 */

import { useState, useEffect, useRef } from "react"
import { Edit2, Save, X, AlertTriangle } from "lucide-react"

interface InlineEditorProps {
  content: string
  filename: string
  onSave: (content: string) => Promise<boolean>
  onCancel: () => void
  readOnly?: boolean
}

// Determine if file type is editable
function isEditable(filename: string): boolean {
  return /\.(md|markdown|json|yaml|yml|xml)$/i.test(filename)
}

// Validate content based on file type
function validateContent(filename: string, content: string): { valid: boolean; error?: string } {
  const ext = filename.split(".").pop()?.toLowerCase()

  if (ext === "json") {
    try {
      JSON.parse(content)
      return { valid: true }
    } catch (err) {
      return { valid: false, error: `Invalid JSON: ${(err as Error).message}` }
    }
  }

  // For markdown, yaml, xml - basic validation
  if (content.trim().length === 0) {
    return { valid: false, error: "Content cannot be empty" }
  }

  return { valid: true }
}

export function InlineEditor({ content, filename, onSave, onCancel, readOnly = false }: InlineEditorProps) {
  const [value, setValue] = useState(content)
  const [isSaving, setIsSaving] = useState(false)
  const [validation, setValidation] = useState<{ valid: boolean; error?: string }>({ valid: true })
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setValue(content)
  }, [content])

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [value])

  const handleSave = async () => {
    // Validate before saving
    const result = validateContent(filename, value)
    setValidation(result)

    if (!result.valid) {
      return
    }

    setIsSaving(true)
    const success = await onSave(value)
    setIsSaving(false)

    if (success) {
      onCancel() // Close editor on successful save
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl + S to save
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault()
      handleSave()
    }
    // Escape to cancel
    if (e.key === "Escape" && !isSaving) {
      onCancel()
    }
  }

  if (!isEditable(filename)) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-yellow-500/10 p-4 text-sm text-yellow-500">
        <AlertTriangle className="h-4 w-4" />
        <span>
          This file type ({filename.split(".").pop()}) is not editable in the dashboard.
          Please use your code editor.
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <Edit2 className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">Editing: {filename}</span>
        </div>
        <div className="flex items-center gap-2">
          {!readOnly && (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving || !validation.valid}
                className={`
                  flex items-center gap-1 rounded-md px-3 py-1.5 text-sm
                  ${isSaving || !validation.valid
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }
                `}
              >
                {isSaving ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="h-3 w-3" />
                    Save
                  </>
                )}
              </button>
              <button
                onClick={onCancel}
                disabled={isSaving}
                className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
              >
                <X className="h-3 w-3" />
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="text-xs text-muted-foreground">
        Press <kbd className="rounded bg-muted px-1">Cmd/Ctrl + S</kbd> to save,
        <kbd className="rounded bg-muted px-1 ml-1">Esc</kbd> to cancel
      </div>

      {/* Editor */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            // Clear validation when user starts typing
            if (!validation.valid) {
              setValidation({ valid: true })
            }
          }}
          onKeyDown={handleKeyDown}
          disabled={isSaving || readOnly}
          className={`
            w-full min-h-[400px] rounded-md border bg-background px-4 py-3 text-sm font-mono
            focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50
            ${!validation.valid ? "border-destructive" : ""}
          `}
          placeholder="Start typing..."
          readOnly={readOnly}
          spellCheck={false}
        />

        {/* Validation error */}
        {!validation.valid && (
          <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span>{validation.error}</span>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
        <div>
          Lines: {value.split("\n").length} · Characters: {value.length}
        </div>
        {content !== value && (
          <div className="flex items-center gap-1 text-blue-500">
            <span>Unsaved changes</span>
          </div>
        )}
      </div>
    </div>
  )
}
