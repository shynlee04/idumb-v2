/**
 * AppearanceTab — Theme toggle, font size, and layout reset.
 *
 * Theme: dark/light toggle using useTheme hook.
 * Font size: persisted to SQLite via settings.
 * Layout: reset IDE panel layout to defaults.
 */

import { useTheme } from "@/hooks/useTheme"
import { useSetting, useSetSetting } from "@/hooks/useSettings"
import { useLayoutStore } from "@/stores/layout-store"
import { cn } from "@/lib/utils"
import { Moon, Sun, RotateCcw } from "lucide-react"

const FONT_SIZES = [12, 13, 14, 16] as const

export function AppearanceTab() {
  const { theme, setTheme } = useTheme()
  const { data: fontSizeSetting } = useSetting("font-size")
  const setSetting = useSetSetting()
  const resetLayout = useLayoutStore((s) => s.resetLayout)

  const currentFontSize = fontSizeSetting?.value ? Number(fontSizeSetting.value) : 14

  const handleFontSize = (size: number) => {
    setSetting.mutate({ key: "font-size", value: String(size) })
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Theme */}
      <section>
        <h2 className="text-sm font-semibold mb-3 text-foreground">Theme</h2>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-colors",
              theme === "dark"
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/20"
            )}
          >
            <Moon className="w-4 h-4" />
            Dark
          </button>
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-colors",
              theme === "light"
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/20"
            )}
          >
            <Sun className="w-4 h-4" />
            Light
          </button>
        </div>
      </section>

      {/* Theme Preview */}
      <section>
        <h2 className="text-sm font-semibold mb-3 text-foreground">Preview</h2>
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded bg-background border border-border" title="Background" />
            <div className="w-8 h-8 rounded bg-primary" title="Primary" />
            <div className="w-8 h-8 rounded bg-secondary" title="Secondary" />
            <div className="w-8 h-8 rounded bg-muted" title="Muted" />
            <div className="w-8 h-8 rounded bg-accent" title="Accent" />
            <div className="w-8 h-8 rounded bg-destructive" title="Destructive" />
          </div>
          <p className="text-xs text-muted-foreground">
            Current theme: <span className="font-medium text-foreground">{theme}</span>
          </p>
        </div>
      </section>

      {/* Font Size */}
      <section>
        <h2 className="text-sm font-semibold mb-3 text-foreground">Editor Font Size</h2>
        <div className="flex items-center gap-2">
          <select
            value={currentFontSize}
            onChange={(e) => handleFontSize(Number(e.target.value))}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md border transition-colors appearance-none cursor-pointer",
              "border-border bg-card text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary/50"
            )}
          >
            {FONT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}px
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">Used by Monaco editor</span>
        </div>
      </section>

      {/* Layout Reset */}
      <section>
        <h2 className="text-sm font-semibold mb-3 text-foreground">IDE Layout</h2>
        <button
          type="button"
          onClick={resetLayout}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border transition-colors",
            "border-border bg-card text-muted-foreground",
            "hover:text-foreground hover:border-foreground/20"
          )}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset panel layout
        </button>
        <p className="text-xs text-muted-foreground mt-1.5">
          Restores sidebar, editor, and terminal panels to default sizes.
        </p>
      </section>
    </div>
  )
}
