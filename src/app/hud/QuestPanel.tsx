import { useGameStore } from '../store'
import './questlog.css'

export function QuestPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const world = useGameStore((s) => s.world)
  const sync = useGameStore((s) => s.syncFromWorld)
  if (!open) return null

  const rows = world.quests.active()

  return (
    <div className="quest-panel" data-testid="quest-log">
      <div className="quest-header">
        <h2>Quest Log</h2>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      {rows.length === 0 && <p className="quest-empty">No Active Quests.</p>}
      {rows.map((e) => {
        const def = world.quests.def(e.questId)
        if (!def) return null
        return (
          <div key={e.questId} className={`quest-entry ${e.status}`}>
            <div className="quest-title">
              {def.title} <span className="qlvl">[{def.level}]</span>
            </div>
            <p className="quest-flavor">{def.flavor}</p>
            <ul>
              {def.objectives.map((o) => (
                <li key={o.id}>
                  {o.text}: {e.counts[o.id] ?? 0}/{o.count}
                </li>
              ))}
            </ul>
            {e.status === 'completed' && (
              <button
                type="button"
                onClick={() => {
                  world.turnInQuest(e.questId)
                  sync()
                }}
              >
                Turn In
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
