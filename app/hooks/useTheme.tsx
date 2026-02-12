/**
 * useTheme — Theme management with React context + localStorage persistence.
 *
 * Provides dark/light theme switching with:
 * - localStorage for instant restore on page load
 * - SQLite (fire-and-forget) for cross-session persistence
 * - <html> class updates for Tailwind CSS dark mode
 *
 * Wrap app with <ThemeProvider> in __root.tsx.
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { setSettingFn } from "../server/settings"

type Theme = "dark" | "light"

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const STORAGE_KEY = "idumb-theme"
const DEFAULT_THEME: Theme = "dark"

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === "dark" || stored === "light") return stored
  return DEFAULT_THEME
}

function applyThemeToDocument(theme: Theme) {
  if (typeof document === "undefined") return
  document.documentElement.className = theme
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  // Apply theme to <html> on mount and changes
  useEffect(() => {
    applyThemeToDocument(theme)
  }, [theme])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(STORAGE_KEY, newTheme)
    applyThemeToDocument(newTheme)
    // Fire-and-forget SQLite persistence
    setSettingFn({ data: { key: "theme", value: newTheme } }).catch(() => {
      // Non-blocking — localStorage is primary
    })
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark")
  }, [theme, setTheme])

  return (
    <ThemeContext value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>")
  return ctx
}
