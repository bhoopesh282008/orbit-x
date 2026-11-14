export interface CursorThemeColors {
  primary: string
  accent: string
  core: string
  trailGlow: string
  trailCore: string
  bracket: string
  tick: string
}

export const CURSOR_THEMES: Record<'dark' | 'light', CursorThemeColors> = {
  dark: {
    primary: '#f0703f', // Signal orange
    accent: '#e8b08a', // Warm sand
    core: '#ffffff',
    trailGlow: 'rgba(240, 112, 63, 0.35)',
    trailCore: 'rgba(240, 112, 63, 0.9)',
    bracket: '#e8b08a',
    tick: 'rgba(240, 112, 63, 0.7)',
  },
  light: {
    primary: '#d4561f',
    accent: '#9a5530',
    core: '#161b22',
    trailGlow: 'rgba(212, 86, 31, 0.3)',
    trailCore: 'rgba(212, 86, 31, 0.9)',
    bracket: '#9a5530',
    tick: 'rgba(212, 86, 31, 0.75)',
  },
}
