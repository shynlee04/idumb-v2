/**
 * DiffToolbar — file name display + inline/side-by-side mode toggle.
 */
import { Columns2, Rows2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DiffToolbarProps {
  fileName: string | null
  sideBySide: boolean
  onToggleMode: () => void
  additions: number
  deletions: number
}

export function DiffToolbar({ fileName, sideBySide, onToggleMode, additions, deletions }: DiffToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/30">
      <span className="text-sm font-medium truncate flex-1">
        {fileName ?? 'Select a file'}
      </span>
      {fileName && (
        <>
          <span className="text-xs text-green-500">+{additions}</span>
          <span className="text-xs text-red-500">-{deletions}</span>
        </>
      )}
      <button
        onClick={onToggleMode}
        className={cn(
          "ml-2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
          "text-xs flex items-center gap-1"
        )}
        title={sideBySide ? "Switch to inline view" : "Switch to side-by-side view"}
      >
        {sideBySide ? (
          <><Rows2 className="w-3.5 h-3.5" /> Inline</>
        ) : (
          <><Columns2 className="w-3.5 h-3.5" /> Side by Side</>
        )}
      </button>
    </div>
  )
}
