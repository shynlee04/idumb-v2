import { useMemo, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import {
  Bot,
  ChevronDown,
  ChevronRight,
  Code2,
  FileText,
  Loader2,
  Sparkles,
  Terminal,
} from "lucide-react"
import type { StreamPart } from "@/lib/api"
import { cn } from "@/lib/utils"

interface PartRendererProps {
  part: StreamPart
  isStreaming?: boolean
}

function ToolStatusBadge({ status }: { status?: string }) {
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-blue-300">
        <Loader2 className="h-3 w-3 animate-spin" />
        running
      </span>
    )
  }

  if (status === "completed") {
    return (
      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300">
        completed
      </span>
    )
  }

  if (status === "error") {
    return (
      <span className="rounded bg-red-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-red-300">
        error
      </span>
    )
  }

  return (
    <span className="rounded bg-zinc-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-300">
      pending
    </span>
  )
}

function JsonBlock({ value }: { value: unknown }) {
  const content = useMemo(() => JSON.stringify(value, null, 2), [value])
  return (
    <pre className="mt-2 overflow-x-auto rounded border border-border bg-zinc-950/60 p-2 text-xs leading-relaxed text-zinc-300">
      {content}
    </pre>
  )
}

export function PartRenderer({ part, isStreaming = false }: PartRendererProps) {
  const [expanded, setExpanded] = useState(false)

  if (part.type === "text") {
    return (
      <div className="rounded-md border border-border/50 bg-zinc-950/40 p-3">
        <div className="markdown text-sm leading-6 text-zinc-100">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
            {part.text ?? ""}
          </ReactMarkdown>
          {isStreaming ? (
            <span className="ml-1 inline-block h-4 w-2 animate-pulse rounded-sm bg-zinc-300/70 align-middle" />
          ) : null}
        </div>
      </div>
    )
  }

  if (part.type === "tool") {
    const toolName = typeof part.tool === "string" ? part.tool : "tool"
    const status = part.state?.status
    const input = part.state?.input
    const output = part.state?.output
    const toolError = part.state?.error

    return (
      <div className="rounded-md border border-border bg-zinc-950/30">
        <button
          className="flex w-full items-center gap-2 px-3 py-2 text-left"
          onClick={() => setExpanded((prev) => !prev)}
          type="button"
        >
          <Terminal className="h-4 w-4 text-blue-300" />
          <span className="flex-1 text-xs font-semibold tracking-wide text-zinc-200">{toolName}</span>
          <ToolStatusBadge status={status} />
          {expanded ? <ChevronDown className="h-4 w-4 text-zinc-400" /> : <ChevronRight className="h-4 w-4 text-zinc-400" />}
        </button>

        {expanded ? (
          <div className="border-t border-border px-3 py-2">
            {input ? (
              <>
                <div className="text-[10px] uppercase tracking-wide text-zinc-400">input</div>
                <JsonBlock value={input} />
              </>
            ) : null}

            {output ? (
              <>
                <div className="mt-3 text-[10px] uppercase tracking-wide text-zinc-400">output</div>
                <pre className="mt-2 overflow-x-auto rounded border border-border bg-zinc-950/60 p-2 text-xs leading-relaxed text-zinc-200">
                  {output}
                </pre>
              </>
            ) : null}

            {toolError ? (
              <p className="mt-3 rounded border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200">
                {toolError}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }

  if (part.type === "step-start" || part.type === "step-finish") {
    return (
      <div className="rounded border border-dashed border-border/70 px-3 py-1 text-xs uppercase tracking-wide text-zinc-400">
        {part.type === "step-start" ? "step started" : "step finished"}
      </div>
    )
  }

  if (part.type === "agent") {
    return (
      <div className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-200">
          <Bot className="h-4 w-4" />
          delegated agent: {typeof part.name === "string" ? part.name : "unknown"}
        </div>
      </div>
    )
  }

  if (part.type === "reasoning") {
    return (
      <details className="rounded-md border border-border bg-zinc-950/20 px-3 py-2">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Thinking
        </summary>
        <p className="mt-2 text-sm italic text-zinc-300">{typeof part.text === "string" ? part.text : ""}</p>
      </details>
    )
  }

  if (part.type === "file") {
    return (
      <div className="rounded-md border border-border bg-zinc-950/20 px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-300">
          <FileText className="h-4 w-4" />
          {typeof part.filename === "string" ? part.filename : "file reference"}
        </div>
      </div>
    )
  }

  if (part.type === "compaction") {
    return (
      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
        Session compacted, context refreshed.
      </div>
    )
  }

  if (part.type === "patch" || part.type === "snapshot") {
    return (
      <div className="rounded border border-border bg-zinc-950/20 px-3 py-2 text-xs text-zinc-300">
        <span className="inline-flex items-center gap-2">
          <Code2 className="h-3.5 w-3.5" />
          {part.type}
        </span>
      </div>
    )
  }

  return (
    <div className={cn("rounded border border-border bg-zinc-950/20 px-3 py-2 text-xs text-zinc-300")}>
      <span className="mb-2 inline-flex items-center gap-2 font-semibold uppercase tracking-wide text-zinc-400">
        <Sparkles className="h-3.5 w-3.5" />
        {part.type}
      </span>
      <JsonBlock value={part} />
    </div>
  )
}
