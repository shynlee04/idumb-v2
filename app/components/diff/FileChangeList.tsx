/**
 * FileChangeList — sidebar showing changed files with +/- counts.
 * Click a file to select it for diff viewing.
 */
import { FileCode, FilePlus, FileX } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FileDiff } from '@/shared/engine-types'

interface FileChangeListProps {
  diffs: FileDiff[]
  selectedFile: string | null
  onSelectFile: (file: string) => void
}

export function FileChangeList({ diffs, selectedFile, onSelectFile }: FileChangeListProps) {
  return (
    <div className="w-56 border-r border-border overflow-y-auto flex-shrink-0">
      <div className="px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Changed Files ({diffs.length})
        </span>
      </div>
      <div className="py-1">
        {diffs.map(diff => {
          const fileName = diff.file.split('/').pop() ?? diff.file
          const dirPath = diff.file.includes('/') ? diff.file.slice(0, diff.file.lastIndexOf('/')) : ''
          const isNew = !diff.before && diff.after
          const isDeleted = diff.before && !diff.after

          return (
            <button
              key={diff.file}
              onClick={() => onSelectFile(diff.file)}
              className={cn(
                "w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors",
                selectedFile === diff.file
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50 text-foreground"
              )}
              title={diff.file}
            >
              {isNew ? (
                <FilePlus className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              ) : isDeleted ? (
                <FileX className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              ) : (
                <FileCode className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{fileName}</div>
                {dirPath && (
                  <div className="truncate text-xs text-muted-foreground">{dirPath}</div>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 text-xs">
                {diff.additions > 0 && (
                  <span className="text-green-500">+{diff.additions}</span>
                )}
                {diff.deletions > 0 && (
                  <span className="text-red-500">-{diff.deletions}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
