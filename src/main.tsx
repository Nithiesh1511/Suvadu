import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { StoreProvider } from './context/StoreContext'
import { CatalogProvider } from './context/CatalogContext'
import { ToastProvider } from './components/Toast'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <CatalogProvider>
          <StoreProvider>
            <App />
          </StoreProvider>
        </CatalogProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
