import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppProvider } from './store.tsx'
import { SalaryProvider } from './store.salary.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <SalaryProvider>
        <App />
      </SalaryProvider>
    </AppProvider>
  </StrictMode>,
)