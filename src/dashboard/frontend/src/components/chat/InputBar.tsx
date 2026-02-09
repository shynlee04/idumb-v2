/**
 * InputBar — Text input + submit button with abort capability.
 *
 * Features:
 * - Multi-line text input (auto-resize)
 * - Submit button (Enter sends, Shift+Enter for newline)
 * - Abort button when streaming
 * - Loading state indicator
 */

import { Send, Square } from "lucide-react"
import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

interface InputBarProps {
  onSubmit: (text: string) => void
  onAbort?: () => void
  isStreaming?: boolean
  isDisabled?: boolean
  placeholder?: string
}

export function InputBar({
  onSubmit,
  onAbort,
  isStreaming = false,
  isDisabled = false,
  placeholder = "Ask a question or run a command...",
}: InputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = useState("")

  useEffect(() => {
    if (!isStreaming && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isStreaming])

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (trimmed && !isStreaming && !isDisabled) {
      onSubmit(trimmed)
      setValue("")
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  return (
    <div className="border-t border-border bg-zinc-950/50 p-4">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isStreaming || isDisabled}
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-md border border-border bg-zinc-900/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60",
            "focus:outline-none focus:ring-2 focus:ring-primary/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "min-h-[40px] max-h-[200px] overflow-y-auto",
          )}
          style={{ height: "40px" }}
        />
        {isStreaming && onAbort ? (
          <Button
            variant="destructive"
            size="icon"
            onClick={onAbort}
            disabled={isDisabled}
            title="Abort"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="default"
            size="icon"
            onClick={handleSubmit}
            disabled={!value.trim() || isStreaming || isDisabled}
            title="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ")
}
