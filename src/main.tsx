import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Router } from 'wouter'
import { App } from './App.tsx'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Root container #root is missing')
}

const app = (
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>
)

createRoot(container).render(app)
