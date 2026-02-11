/**
 * CodeBlock — custom code component for react-markdown's `components` prop.
 *
 * Handles both inline and block code. Block code gets:
 * - Language badge (top-left in header bar)
 * - Line numbers in gutter column
 * - Copy button on hover (top-right in header bar)
 * - Syntax highlighting via highlight.js (done internally, NOT via rehype-highlight)
 *
 * Why highlight internally instead of using rehype-highlight:
 * react-markdown's rehype-highlight processes the AST _before_ this component
 * receives children, turning plain text into React elements with hljs class spans.
 * Splitting React elements by newline for line numbers is lossy — all highlighting
 * is stripped. Instead, we receive plain text children (no rehype-highlight upstream),
 * highlight with hljs ourselves, split the highlighted HTML by `\n`, and render
 * each line with dangerouslySetInnerHTML to preserve hljs class spans.
 */

import { useState, useCallback, useMemo, type HTMLAttributes } from "react"
import { Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import hljs from "highlight.js"

/** Language display names for common languages */
const LANGUAGE_LABELS: Record<string, string> = {
  typescript: "TypeScript",
  javascript: "JavaScript",
  tsx: "TSX",
  jsx: "JSX",
  python: "Python",
  rust: "Rust",
  go: "Go",
  bash: "Bash",
  sh: "Shell",
  json: "JSON",
  yaml: "YAML",
  html: "HTML",
  css: "CSS",
  sql: "SQL",
  markdown: "Markdown",
  md: "Markdown",
  ruby: "Ruby",
  java: "Java",
  c: "C",
  cpp: "C++",
  csharp: "C#",
  php: "PHP",
  swift: "Swift",
  kotlin: "Kotlin",
  toml: "TOML",
  xml: "XML",
  dockerfile: "Dockerfile",
}

function getLanguageLabel(lang: string): string {
  return LANGUAGE_LABELS[lang] || lang.charAt(0).toUpperCase() + lang.slice(1)
}

/**
 * Split highlighted HTML by newlines while preserving open tags across line
 * boundaries. When a tag (e.g. <span class="hljs-comment">) spans multiple
 * lines, this helper closes it at the end of each line and re-opens it at
 * the start of the next line so each line renders independently.
 */
function splitHighlightedHtml(html: string): string[] {
  const rawLines = html.split("\n")
  const result: string[] = []
  let openTags: string[] = []

  for (const line of rawLines) {
    // Re-open tags from previous lines
    const prefix = openTags.join("")

    // Track tags in this line
    const tagRegex = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g
    let tagMatch: RegExpExecArray | null
    while ((tagMatch = tagRegex.exec(line)) !== null) {
      const isClosing = tagMatch[1] === "/"
      if (isClosing) {
        openTags.pop()
      } else {
        openTags.push(tagMatch[0])
      }
    }

    // Close open tags at end of line
    const closeSuffix = [...openTags]
      .reverse()
      .map((tag) => {
        const name = tag.match(/<([a-zA-Z][a-zA-Z0-9]*)/)?.[1] || "span"
        return `</${name}>`
      })
      .join("")

    result.push(prefix + line + closeSuffix)
  }

  return result
}

type CodeBlockProps = HTMLAttributes<HTMLElement> & {
  children?: React.ReactNode
}

export function CodeBlock({ children, className, ...props }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  // Detect block vs inline code: block code has a language-* className
  const match = className?.match(/language-(\w+)/)
  const language = match?.[1]
  const isBlock = !!language

  // Extract plain text from children (may be string or React elements)
  const text = useMemo(
    () => (typeof children === "string" ? children : extractText(children)),
    [children]
  )

  // Highlight and split into lines (only for block code)
  const highlightedLines = useMemo(() => {
    if (!isBlock) return []
    const trimmed = text.replace(/\n$/, "")
    try {
      const result = language && hljs.getLanguage(language)
        ? hljs.highlight(trimmed, { language })
        : hljs.highlightAuto(trimmed)
      return splitHighlightedHtml(result.value)
    } catch {
      // Fallback to plain text if highlighting fails
      return trimmed.split("\n").map(escapeHtml)
    }
  }, [text, language, isBlock])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [text])

  // Inline code: simple styled span
  if (!isBlock) {
    return (
      <code
        className={cn(
          "bg-muted px-1.5 py-0.5 rounded text-[0.85em] font-mono",
          className
        )}
        {...props}
      >
        {children}
      </code>
    )
  }

  // Block code: full-featured code block with highlighting + line numbers
  return (
    <div className="group relative my-3 rounded-lg border border-border overflow-hidden bg-muted/30">
      {/* Header bar: language badge + copy button */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border text-xs">
        <span className="text-muted-foreground font-mono">
          {getLanguageLabel(language)}
        </span>
        <button
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded text-muted-foreground",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "hover:bg-muted hover:text-foreground"
          )}
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-500" />
              <span className="text-green-500">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code area with line numbers */}
      <pre className="overflow-x-auto p-0 m-0 bg-transparent">
        <code className={cn(className, "hljs block text-sm leading-relaxed")}>
          <table className="border-collapse w-full">
            <tbody>
              {highlightedLines.map((lineHtml, i) => (
                <tr key={i} className="hover:bg-muted/30">
                  <td className="select-none text-right pr-3 pl-3 text-muted-foreground/50 text-xs w-[1%] whitespace-nowrap align-top">
                    {i + 1}
                  </td>
                  <td className="pr-4">
                    <span
                      dangerouslySetInnerHTML={{
                        __html: lineHtml || "\n",
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </code>
      </pre>
    </div>
  )
}

/** Recursively extract text content from React children */
function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node
  if (typeof node === "number") return String(node)
  if (!node) return ""
  if (Array.isArray(node)) return node.map(extractText).join("")
  if (typeof node === "object" && "props" in node) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return extractText((node as React.ReactElement<{ children?: React.ReactNode }>).props.children)
  }
  return ""
}

/** Escape HTML entities for safe rendering */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
