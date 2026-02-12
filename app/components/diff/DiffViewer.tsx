/**
 * DiffViewer — session diff viewer with file list + Monaco DiffEditor.
 *
 * CRITICAL: Implements aggressive DiffEditor disposal to mitigate
 * memory leak (GitHub monaco-editor#4659). Models are explicitly
 * disposed on unmount alongside the editor instance.
 */
import { useRef, useEffect } from 'react'
import { DiffEditor } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useSessionDiff } from '@/hooks/useSessionDiff'
import { useDiffStore } from '@/stores/diff-store'
import { FileChangeList } from './FileChangeList'
import { DiffToolbar } from './DiffToolbar'

// ─── Language Detection (copied from MonacoEditor.tsx — no cross-coupling) ───

const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'typescriptreact', js: 'javascript', jsx: 'javascriptreact',
  json: 'json', css: 'css', scss: 'scss', html: 'html', md: 'markdown',
  py: 'python', rs: 'rust', go: 'go', yaml: 'yaml', yml: 'yaml',
  sh: 'shell', bash: 'shell', zsh: 'shell', toml: 'toml', sql: 'sql',
  xml: 'xml', svg: 'xml',
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  return EXT_TO_LANG[ext] ?? 'plaintext'
}

// ─── DiffViewer Component ────────────────────────────────────────────────────

interface DiffViewerProps {
  sessionId: string
}

export function DiffViewer({ sessionId }: DiffViewerProps) {
  const { data: diffs, isLoading, error } = useSessionDiff(sessionId)
  const { selectedFile, sideBySide, setSelectedFile, toggleSideBySide } = useDiffStore()
  const diffEditorRef = useRef<editor.IStandaloneDiffEditor | null>(null)

  // Auto-select first file on data load
  useEffect(() => {
    if (diffs && diffs.length > 0 && !selectedFile) {
      setSelectedFile(diffs[0].file)
    }
  }, [diffs, selectedFile, setSelectedFile])

  // CRITICAL — Memory leak mitigation: dispose editor + models on unmount
  useEffect(() => {
    return () => {
      if (diffEditorRef.current) {
        try {
          const orig = diffEditorRef.current.getOriginalEditor().getModel()
          const mod = diffEditorRef.current.getModifiedEditor().getModel()
          diffEditorRef.current.dispose()
          orig?.dispose()
          mod?.dispose()
        } catch {
          // Silently handle disposal errors
        }
        diffEditorRef.current = null
      }
    }
  }, [])

  // Reset diff store on unmount
  useEffect(() => {
    return () => { useDiffStore.getState().reset() }
  }, [])

  // Find the selected diff
  const selectedDiff = diffs?.find(d => d.file === selectedFile)

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Loading changes...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-destructive">
        <p className="text-sm">Failed to load changes: {error.message}</p>
      </div>
    )
  }

  if (!diffs || diffs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p className="text-sm">No changes in this session</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex min-h-0">
      {/* File change list sidebar */}
      <FileChangeList
        diffs={diffs}
        selectedFile={selectedFile}
        onSelectFile={setSelectedFile}
      />

      {/* Diff editor area */}
      <div className="flex-1 flex flex-col min-w-0">
        <DiffToolbar
          fileName={selectedDiff?.file ?? null}
          sideBySide={sideBySide}
          onToggleMode={toggleSideBySide}
          additions={selectedDiff?.additions ?? 0}
          deletions={selectedDiff?.deletions ?? 0}
        />

        {selectedDiff ? (
          <div className="flex-1 min-h-0">
            <DiffEditor
              original={selectedDiff.before}
              modified={selectedDiff.after}
              language={detectLanguage(selectedDiff.file)}
              theme="vs-dark"
              onMount={(editor) => { diffEditorRef.current = editor }}
              options={{
                renderSideBySide: sideBySide,
                readOnly: true,
                automaticLayout: true,
                enableSplitViewResizing: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                renderOverviewRuler: true,
              }}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p className="text-sm">Select a file to view its diff</p>
          </div>
        )}
      </div>
    </div>
  )
}
