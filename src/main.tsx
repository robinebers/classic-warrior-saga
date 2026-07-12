import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GameApp } from './app/GameApp'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameApp />
  </StrictMode>,
)
