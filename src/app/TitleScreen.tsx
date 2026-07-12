import { useGameStore } from './store'
import './title.css'

export function TitleScreen({ onContinue, onNew }: { onContinue: () => void; onNew: () => void }) {
  const hasSave = typeof localStorage !== 'undefined' && !!localStorage.getItem('cws.save.quick')

  return (
    <div className="title-root" data-testid="title-screen">
      <div className="title-panel">
        <h1>Classic Warrior Saga</h1>
        <p className="subtitle">An Offline Homage To The Classic Warrior Feel</p>
        <div className="title-buttons">
          {hasSave && (
            <button type="button" data-testid="btn-continue" onClick={onContinue}>
              Continue
            </button>
          )}
          <button type="button" data-testid="btn-new" onClick={onNew}>
            New Character
          </button>
        </div>
        <p className="ver">v0.1.0 · Local Only · No Network</p>
      </div>
    </div>
  )
}

export function useTitleGate() {
  return useGameStore((s) => s.started)
}
