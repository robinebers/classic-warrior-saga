import { useGameStore } from '../store'
import './stancebar.css'

export function StanceBar() {
  const world = useGameStore((s) => s.world)
  const sync = useGameStore((s) => s.syncFromWorld)
  const stance = world.player.stance

  const set = (s: 'battle' | 'defensive' | 'berserker') => {
    world.switchStance(s)
    sync()
  }

  const knownD = (world.player.knownAbilities.defensive_stance ?? 0) > 0
  const knownZ = (world.player.knownAbilities.berserker_stance ?? 0) > 0

  return (
    <div className="stance-bar" data-testid="stance-bar">
      <button
        type="button"
        className={stance === 'battle' ? 'active' : ''}
        title="Battle Stance (Ctrl+1)"
        onClick={() => set('battle')}
      >
        B
      </button>
      <button
        type="button"
        className={stance === 'defensive' ? 'active' : ''}
        disabled={!knownD}
        title="Defensive Stance (Ctrl+2)"
        onClick={() => set('defensive')}
      >
        D
      </button>
      <button
        type="button"
        className={stance === 'berserker' ? 'active' : ''}
        disabled={!knownZ}
        title="Berserker Stance (Ctrl+3)"
        onClick={() => set('berserker')}
      >
        Z
      </button>
    </div>
  )
}
