import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { StoreProvider } from './context/StoreContext'
import { CatalogProvider } from './context/CatalogContext'
import { ToastProvider } from './components/Toast'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Opt in to the v7 behaviours now, while they are still opt-in: navigation
        state updates go through React.startTransition, and relative paths under
        a splat route resolve the v7 way. Both are no-ops for this app today —
        every Link here is absolute — so this only silences the upgrade warnings
        and keeps the eventual v7 bump uneventful. */}
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthProvider>
          <CatalogProvider>
            <StoreProvider>
              <App />
            </StoreProvider>
          </CatalogProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
