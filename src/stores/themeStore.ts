import { create } from 'zustand'

export type AppTheme = 'dark' | 'light'

interface ThemeStore {
  theme: AppTheme
  setTheme: (theme: AppTheme) => void
  toggleTheme: () => void
}

const STORAGE_KEY = 'orbit-x-theme'

function getInitialTheme(): AppTheme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') {
      return saved
    }
  } catch {}
  return 'dark'
}

function applyThemeToDOM(theme: AppTheme) {
  const root = document.documentElement
  if (theme === 'light') {
    root.classList.remove('dark')
    root.classList.add('light')
    root.setAttribute('data-theme', 'light')
    root.style.colorScheme = 'light'
  } else {
    root.classList.remove('light')
    root.classList.add('dark')
    root.setAttribute('data-theme', 'dark')
    root.style.colorScheme = 'dark'
  }
}

export const useThemeStore = create<ThemeStore>((set, get) => {
  const initialTheme = getInitialTheme()
  if (typeof window !== 'undefined') {
    applyThemeToDOM(initialTheme)
  }

  return {
    theme: initialTheme,
    setTheme: (theme: AppTheme) => {
      try {
        localStorage.setItem(STORAGE_KEY, theme)
      } catch {}
      applyThemeToDOM(theme)
      set({ theme })
    },
    toggleTheme: () => {
      const nextTheme = get().theme === 'dark' ? 'light' : 'dark'
      get().setTheme(nextTheme)
    },
  }
})

