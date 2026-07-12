import { trainCostCopper } from '@game-core/Formulas'
import { ABILITIES, highestLearnableRank } from '@game-core/abilities/AbilityData'
import { useGameStore } from '../store'
import './trainer.css'

export function TrainerPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const world = useGameStore((s) => s.world)
  const sync = useGameStore((s) => s.syncFromWorld)
  if (!open) return null

  const rows = ABILITIES.flatMap((def) => {
    const known = world.player.knownAbilities[def.id] ?? 0
    return def.ranks.map((rank) => {
      const cost = trainCostCopper(rank.learnLevel)
      let state: 'known' | 'learnable' | 'locked' = 'locked'
      if (rank.rank <= known) state = 'known'
      else if (rank.learnLevel <= world.player.level && rank.rank === known + 1) state = 'learnable'
      else if (rank.learnLevel <= world.player.level && known === 0 && rank.rank === 1) state = 'learnable'
      return { def, rank, cost, state }
    })
  })

  const learn = (abilityId: string) => {
    const def = ABILITIES.find((a) => a.id === abilityId)
    if (!def) return
    const known = world.player.knownAbilities[abilityId] ?? 0
    const next = highestLearnableRank(def, world.player.level, known)
    if (!next) return
    const cost = trainCostCopper(next.learnLevel)
    if (world.player.copper < cost) {
      world.events.push({ type: 'chat', channel: 'error', text: 'Not Enough Money' })
      sync()
      return
    }
    world.player.copper -= cost
    world.player.knownAbilities[abilityId] = next.rank
    world.events.push({
      type: 'abilityLearned',
      abilityId,
      rank: next.rank,
    })
    world.events.push({
      type: 'chat',
      channel: 'system',
      text: `You Have Learned ${def.name} (Rank ${next.rank}).`,
    })
    sync()
  }

  return (
    <div className="trainer-panel" data-testid="trainer-panel">
      <div className="trainer-header">
        <h2>Warlord Kargha</h2>
        <span>{formatMoney(world.player.copper)}</span>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="trainer-list">
        {rows.map(({ def, rank, cost, state }) => (
          <div key={`${def.id}-${rank.rank}`} className={`trainer-row ${state}`}>
            <span>
              {def.name} Rank {rank.rank}
            </span>
            <span>L{rank.learnLevel}</span>
            <span>{formatMoney(cost)}</span>
            {state === 'learnable' ? (
              <button type="button" onClick={() => learn(def.id)}>
                Train
              </button>
            ) : (
              <span className="state">{state}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function formatMoney(copper: number): string {
  const g = Math.floor(copper / 10000)
  const s = Math.floor((copper % 10000) / 100)
  const c = copper % 100
  if (g > 0) return `${g}g ${s}s ${c}c`
  if (s > 0) return `${s}s ${c}c`
  return `${c}c`
}
