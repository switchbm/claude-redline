import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyTheme, applyDefaultTheme, type ConfigResponse } from './themes'

// Apply default theme immediately for fast initial render
applyDefaultTheme()

// Fetch and apply the configured theme from the server
async function loadTheme(): Promise<void> {
  try {
    const response = await fetch('/api/config')
    if (response.ok) {
      const config: ConfigResponse = await response.json()
      applyTheme(config.theme)
      console.log(`Theme loaded: ${config.theme.name}`)
    }
  } catch (error) {
    // If config fetch fails, we already have the default theme applied
    console.warn('Failed to load theme config, using default:', error)
  }
}

// Load theme then render the app
loadTheme().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
