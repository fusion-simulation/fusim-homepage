import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
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

// 预渲染产物已有 DOM：接管而不是重绘（dev 的壳是空容器，仍走 createRoot）
if (container.hasChildNodes()) {
  hydrateRoot(container, app)
} else {
  createRoot(container).render(app)
}
