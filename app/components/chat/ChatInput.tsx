/**
 * ChatInput — text input with send/abort controls.
 *
 * Enter sends, Shift+Enter inserts newline. Textarea auto-grows up to 200px.
 * When streaming=true, shows a red "Stop" button instead of "Send".
 */

import { useRef, useState, useCallback, type KeyboardEvent } from "react"
import { Send, Square } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSend: (text: string) => void
  onAbort: () => void
  streaming: boolean
  disabled?: boolean
}

export function ChatInput({ onSend, onAbort, streaming, disabled }: ChatInputProps) {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const text = value.trim()
    if (!text || streaming || disabled) return
    onSend(text)
    setValue("")
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }, [value, streaming, disabled, onSend])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleInput = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [])

  return (
    <div className="border-t border-border bg-background p-4">
      <div className="flex items-end gap-2 max-w-3xl mx-auto">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Send a message..."
          disabled={disabled}
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-lg border border-border bg-muted/30 px-3 py-2",
            "text-sm placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-1 focus:ring-ring",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        />

        {streaming ? (
          <button
            type="button"
            onClick={onAbort}
            className={cn(
              "flex-shrink-0 rounded-lg p-2",
              "bg-destructive text-destructive-foreground",
              "hover:bg-destructive/90 transition-colors"
            )}
            title="Stop generating"
          >
            <Square className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!value.trim() || disabled}
            className={cn(
              "flex-shrink-0 rounded-lg p-2",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
