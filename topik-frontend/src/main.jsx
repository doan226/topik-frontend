import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/theme.css'
import './index.css'
import './styles/app-theme.css'
import { applyTheme, getTheme } from './utils/theme'
import { resolveDevApiPort } from './api/devPort'
import App from './App.tsx'

applyTheme(getTheme())

resolveDevApiPort().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
})