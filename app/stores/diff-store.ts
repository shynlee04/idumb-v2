/**
 * Diff viewer store — selected file and display mode.
 * Not persisted (transient view state).
 */
import { create } from "zustand"

interface DiffStoreState {
  selectedFile: string | null
  sideBySide: boolean
  setSelectedFile: (file: string | null) => void
  toggleSideBySide: () => void
  setSideBySide: (value: boolean) => void
  reset: () => void
}

export const useDiffStore = create<DiffStoreState>((set) => ({
  selectedFile: null,
  sideBySide: true,
  setSelectedFile: (file) => set({ selectedFile: file }),
  toggleSideBySide: () => set((s) => ({ sideBySide: !s.sideBySide })),
  setSideBySide: (value) => set({ sideBySide: value }),
  reset: () => set({ selectedFile: null, sideBySide: true }),
}))
