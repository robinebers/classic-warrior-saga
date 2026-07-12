import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { GameApp } from './app/GameApp'
import { TitleScreen } from './app/TitleScreen'
import { useGameStore } from './app/store'
import { loadFromLocalStorage } from '@game-core/save/SaveGame'
import './index.css'

function Root() {
  const [showTitle, setShowTitle] = useState(true)
  const start = useGameStore((s) => s.start)
  const world = useGameStore((s) => s.world)

  const onNew = () => {
    start()
    setShowTitle(false)
  }
  const onContinue = () => {
    const save = loadFromLocalStorage('quick')
    if (save) {
      Object.assign(world.player, save.player)
      world.rng.setSeedState(save.rngState)
    }
    start()
    setShowTitle(false)
  }

  return (
    <>
      {!showTitle && <GameApp />}
      {showTitle && <TitleScreen onContinue={onContinue} onNew={onNew} />}
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
