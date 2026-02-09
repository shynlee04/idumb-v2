import { AtSign, Paperclip, Send, Slash, Square } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

interface InputBarProps {
  onSend: (text: string) => void
  onAbort: () => void
  isStreaming: boolean
}

export function InputBar({ onSend, onAbort, isStreaming }: InputBarProps) {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!isStreaming) textareaRef.current?.focus()
  }, [isStreaming])

  const submit = () => {
    const text = value.trim()
    if (!text || isStreaming) return
    onSend(text)
    setValue("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "40px"
    }
  }

  return (
    <div className="border-t border-border bg-zinc-950/40 px-4 py-3">
      <div className="mb-2 flex items-center gap-1 text-zinc-400">
        <button className="rounded p-1.5 hover:bg-zinc-800/60" type="button" title="Attach file (coming soon)">
          <Paperclip className="h-4 w-4" />
        </button>
        <button className="rounded p-1.5 hover:bg-zinc-800/60" type="button" title="Mention agent (coming soon)">
          <AtSign className="h-4 w-4" />
        </button>
        <button className="rounded p-1.5 hover:bg-zinc-800/60" type="button" title="Slash commands (coming soon)">
          <Slash className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          className="min-h-[40px] max-h-[220px] flex-1 resize-none overflow-y-auto rounded-md border border-border bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          rows={1}
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            event.target.style.height = "40px"
            event.target.style.height = `${Math.min(event.target.scrollHeight, 220)}px`
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              submit()
            }
          }}
          placeholder="Message iDumb..."
          disabled={isStreaming}
        />

        {isStreaming ? (
          <Button size="icon" variant="destructive" onClick={onAbort} title="Abort response">
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={submit}
            disabled={value.trim().length === 0}
            title="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
