import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// `?lite` on the first URL (even a demo link that later redirects) enables low-power graphics for the session
try {
  if (new URLSearchParams(window.location.search).has('lite')) sessionStorage.setItem('orbit-x-lite', '1')
} catch {
  /* storage unavailable: lite mode simply isn't remembered */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
