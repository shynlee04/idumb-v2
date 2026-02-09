import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { useSessionChildren } from "@/hooks/useSession"

interface DelegationThreadProps {
  sessionId: string
  depth?: number
}

function DelegationNode({ sessionId, depth }: { sessionId: string; depth: number }) {
  const { data: children = [] } = useSessionChildren(sessionId)
  const [open, setOpen] = useState(false)

  if (children.length === 0) return null

  return (
    <div className="mt-2 border-l border-indigo-500/30 pl-3" style={{ marginLeft: `${depth * 12}px` }}>
      {children.map((child) => (
        <div key={child.id} className="mb-2 rounded border border-indigo-500/30 bg-indigo-500/10 p-2">
          <button
            type="button"
            className="flex w-full items-center gap-2 text-left text-xs text-indigo-100"
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <span className="font-semibold">{child.title || `Delegated ${child.id.slice(0, 8)}`}</span>
          </button>

          {open && depth < 3 ? (
            <DelegationNode sessionId={child.id} depth={depth + 1} />
          ) : null}
        </div>
      ))}
    </div>
  )
}

export function DelegationThread({ sessionId, depth = 0 }: DelegationThreadProps) {
  return <DelegationNode sessionId={sessionId} depth={depth} />
}
