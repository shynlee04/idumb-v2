/**
 * MonacoEditor — Single editor instance with model-swapping for multi-tab support.
 *
 * Architecture:
 * - ONE editor instance lives for the component's lifetime
 * - Each file gets its own Monaco model (keyed by URI)
 * - Switching tabs swaps models, preserving cursor/scroll via view states
 * - Content changes mark the tab dirty; Cmd/Ctrl+S saves and clears dirty state
 * - 20-model LRU cap prevents memory accumulation
 *
 * Store integration:
 * - Reads activeTabId from ide-store to know which file to display
 * - Calls markDirty/markClean/saveViewState on the store
 * - Uses readFileFn/writeFileFn server functions for file I/O
 */

import { useRef, useEffect, useCallback } from 'react';
import Editor, { useMonaco, type Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useIDEStore } from '../../stores/ide-store';
import { readFileFn, writeFileFn } from '../../server/files';

// ─── Language Detection ─────────────────────────────────────────────────────

const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'typescriptreact', js: 'javascript', jsx: 'javascriptreact',
  json: 'json', css: 'css', scss: 'scss', html: 'html', md: 'markdown',
  py: 'python', rs: 'rust', go: 'go', yaml: 'yaml', yml: 'yaml',
  sh: 'shell', bash: 'shell', zsh: 'shell', toml: 'toml', sql: 'sql',
  xml: 'xml', svg: 'xml', graphql: 'graphql', gql: 'graphql',
};

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_LANG[ext] ?? 'plaintext';
}

// ─── Monaco Editor Component ────────────────────────────────────────────────

const MAX_MODELS = 20;

export function MonacoEditor() {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const modelsRef = useRef<Map<string, boolean>>(new Map()); // tracks which paths have models
  const previousPathRef = useRef<string | null>(null);
  const monaco = useMonaco();
  const activeTabId = useIDEStore(s => s.activeTabId);
  const markDirty = useIDEStore(s => s.markDirty);
  const saveViewState = useIDEStore(s => s.saveViewState);

  // ── Model-swapping effect ───────────────────────────────────────────────
  // Runs when activeTabId changes — saves previous view state, swaps model,
  // restores view state for the new tab, and focuses the editor.
  useEffect(() => {
    if (!editorRef.current || !monaco || !activeTabId) return;

    const ed = editorRef.current;
    let stale = false;

    // Save view state of previous tab (plain path, not URI)
    if (previousPathRef.current && previousPathRef.current !== activeTabId) {
      const vs = ed.saveViewState();
      if (vs) saveViewState(previousPathRef.current, vs);
    }
    previousPathRef.current = activeTabId;

    // Construct Monaco URI and check for existing model
    const uri = monaco.Uri.parse('file:///' + activeTabId);
    const existingModel = monaco.editor.getModel(uri);

    if (existingModel) {
      // Model already cached — just swap
      ed.setModel(existingModel);
      const vs = useIDEStore.getState().viewStates[activeTabId];
      if (vs) ed.restoreViewState(vs as editor.ICodeEditorViewState);
      ed.focus();
    } else {
      // Fetch file content from server, then create model
      readFileFn({ data: { filePath: activeTabId } })
        .then((result: { content: string; size: number }) => {
          if (stale) return;

          // Double-check model wasn't created by a concurrent effect
          let model = monaco.editor.getModel(uri);
          if (!model) {
            model = monaco.editor.createModel(
              result.content,
              detectLanguage(activeTabId),
              uri,
            );
            modelsRef.current.set(activeTabId, true);

            // LRU cap: dispose oldest model if over limit
            if (modelsRef.current.size > MAX_MODELS) {
              const openPaths = new Set(
                useIDEStore.getState().openTabs.map(t => t.path),
              );
              for (const [path] of modelsRef.current) {
                if (path !== activeTabId && !openPaths.has(path)) {
                  const oldUri = monaco.Uri.parse('file:///' + path);
                  monaco.editor.getModel(oldUri)?.dispose();
                  modelsRef.current.delete(path);
                  break;
                }
              }
            }
          }

          ed.setModel(model);
          const vs = useIDEStore.getState().viewStates[activeTabId];
          if (vs) ed.restoreViewState(vs as editor.ICodeEditorViewState);
          ed.focus();
        })
        .catch((err: unknown) => {
          if (!stale) console.error('[MonacoEditor] Failed to load file:', err);
        });
    }

    return () => { stale = true; };
  }, [activeTabId, monaco, saveViewState]);

  // ── Mount handler ─────────────────────────────────────────────────────────
  // Registers content change listener (dirty tracking) and Cmd/Ctrl+S save.
  const handleMount = useCallback(
    (ed: editor.IStandaloneCodeEditor, monacoInstance: Monaco) => {
      editorRef.current = ed;

      // Content change → mark dirty (uses store's current activeTabId)
      ed.onDidChangeModelContent(() => {
        const currentPath = useIDEStore.getState().activeTabId;
        if (currentPath) markDirty(currentPath);
      });

      // Cmd/Ctrl+S → save file and clear dirty indicator
      ed.addCommand(
        monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS,
        () => {
          const currentPath = useIDEStore.getState().activeTabId;
          const content = ed.getModel()?.getValue();
          if (currentPath && content != null) {
            writeFileFn({ data: { filePath: currentPath, content } })
              .then(() => useIDEStore.getState().markClean(currentPath))
              .catch(err => console.error('[MonacoEditor] Save failed:', err));
          }
        },
      );
    },
    [markDirty],
  );

  // ── Cleanup ───────────────────────────────────────────────────────────────
  // Dispose editor on unmount. Models are global but LRU cap prevents leaks.
  useEffect(() => {
    return () => {
      editorRef.current?.dispose();
      modelsRef.current.clear();
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Editor
      theme="vs-dark"
      onMount={handleMount}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        wordWrap: 'on',
        automaticLayout: true,
        scrollBeyondLastLine: false,
        padding: { top: 8 },
      }}
    />
  );
}
