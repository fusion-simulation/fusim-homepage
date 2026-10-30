import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { Router } from 'wouter'
import { App } from './App.tsx'
import 'katex/dist/katex.min.css'

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

// `npm run build:ssg` 会预渲染 HTML，此时 hydration；SPA 构建时容器为空，直接挂载。
if (container.childElementCount > 0) {
  hydrateRoot(container, app)
} else {
  createRoot(container).render(app)
}
