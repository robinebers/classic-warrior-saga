import { useMemo, useState } from 'react'
import {
  TALENTS,
  canSpendPoint,
  talentPointsAvailable,
  treePoints,
  type TalentState,
} from '@game-core/talents/TalentData'
import { useGameStore } from '../store'
import './talents.css'

export function TalentPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const world = useGameStore((s) => s.world)
  const [, bump] = useState(0)
  const spent: TalentState = world.player.talents
  const available = talentPointsAvailable(world.player.level, spent)

  const trees = useMemo(() => ['arms', 'fury', 'protection'] as const, [])

  if (!open) return null

  const spend = (id: string) => {
    if (!canSpendPoint(spent, id, available)) return
    world.player.talents[id] = (world.player.talents[id] ?? 0) + 1
    bump((n) => n + 1)
  }

  return (
    <div className="talent-panel" data-testid="talent-panel">
      <div className="talent-header">
        <h2>Talents</h2>
        <span>{available} Points Left</span>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="talent-trees">
        {trees.map((tree) => (
          <div key={tree} className="talent-tree" data-testid={`talent-tree-${tree}`}>
            <h3>
              {tree} · {treePoints(spent, tree)}
            </h3>
            {TALENTS.filter((t) => t.tree === tree).map((t) => {
              const rank = spent[t.id] ?? 0
              const ok = canSpendPoint(spent, t.id, available)
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`talent-node ${rank ? 'spent' : ''} ${ok ? 'can' : 'locked'}`}
                  title={t.description}
                  onClick={() => spend(t.id)}
                >
                  <span>{t.name}</span>
                  <span>
                    {rank}/{t.maxRanks}
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
