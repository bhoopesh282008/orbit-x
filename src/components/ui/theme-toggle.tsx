import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

interface ThemeToggleProps {
  className?: string
  compact?: boolean
}

export function ThemeToggle({ className = '', compact = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()

  return (
    <div
      className={`inline-flex items-center p-1 rounded-xl bg-bg-elevated/80 border border-white/10 backdrop-blur-md shadow-sm select-none ${className}`}
      role="group"
      aria-label="Application Theme Selection"
    >
      {/* Dark Theme Button */}
      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all duration-200 cursor-pointer ${
          theme === 'dark'
            ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/30 font-bold'
            : 'text-text-muted hover:text-text-primary hover:bg-white/5'
        }`}
        title="Switch to Dark Mode"
      >
        <Moon className="h-3.5 w-3.5" />
        {!compact && <span>Dark</span>}
      </button>

      {/* Light Theme Button */}
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all duration-200 cursor-pointer ${
          theme === 'light'
            ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/30 font-bold'
            : 'text-text-muted hover:text-text-primary hover:bg-white/5'
        }`}
        title="Switch to Light Mode"
      >
        <Sun className="h-3.5 w-3.5" />
        {!compact && <span>Light</span>}
      </button>
    </div>
  )
}

