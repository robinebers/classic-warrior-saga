import { useEffect } from 'react'
import { useGameStore } from '../store'
import { xpToLevel } from '@game-core/Formulas'
import './hud.css'

export function Hud() {
  const hud = useGameStore((s) => s.hud)
  const world = useGameStore((s) => s.world)
  const sync = useGameStore((s) => s.syncFromWorld)
  const handleEvents = useGameStore((s) => s.handleEvents)

  useEffect(() => {
    const onConsole = (e: Event) => {
      const { cmd, args } = (e as CustomEvent).detail
      world.queueIntent({ type: 'debug', cmd, args })
      world.tick(0.05)
      handleEvents(world.drainEvents())
      sync()
    }
    window.addEventListener('cws-console', onConsole)
    return () => window.removeEventListener('cws-console', onConsole)
  }, [world, sync, handleEvents])

  const xpNeed = hud.level >= 60 ? 1 : xpToLevel(hud.level) || 1
  const xpPct = Math.min(1, hud.xp / xpNeed)
  const bubbles = Array.from({ length: 20 }, (_, i) => {
    const fill = Math.min(1, Math.max(0, xpPct * 20 - i))
    return fill
  })

  const labels: Record<string, string> = {
    attack: 'ATK',
    heroic_strike: 'HS',
    battle_shout: 'BS',
    charge: 'CHG',
    rend: 'RND',
    thunder_clap: 'TC',
    hamstring: 'HSG',
    bloodrage: 'BR',
    overpower: 'OP',
    execute: 'EXE',
  }

  return (
    <div className="hud-root" data-testid="hud-root">
      {hud.errorText && (
        <div className="hud-error" data-testid="hud-error">
          {hud.errorText}
        </div>
      )}

      <div className="unit-frames">
        <div className="unit-frame player-frame" data-testid="player-frame">
          <div className="portrait orc" />
          <div className="frame-body">
            <div className="name-row">
              <span data-testid="player-name">Thrakmar</span>
              <span className="level-badge" data-testid="player-level">
                {hud.level}
              </span>
            </div>
            <div className="bar hp" title={`${hud.health} / ${hud.maxHealth}`}>
              <div style={{ width: `${(hud.health / hud.maxHealth) * 100}%` }} />
              <span>
                {hud.health}/{hud.maxHealth}
              </span>
            </div>
            <div className="bar rage" data-testid="rage-bar">
              <div style={{ width: `${hud.rage}%` }} />
              <span>{hud.rage}</span>
            </div>
          </div>
        </div>

        {hud.targetName && (
          <div className="unit-frame target-frame" data-testid="target-frame">
            <div className="portrait mob" />
            <div className="frame-body">
              <div className="name-row">
                <span data-testid="target-name">{hud.targetName}</span>
              </div>
              <div className="bar hp">
                <div style={{ width: `${(hud.targetHpPct ?? 0) * 100}%` }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="minimap" data-testid="minimap">
        <div className="minimap-label">Valley Of Trials</div>
        <div className="minimap-dot" />
      </div>

      <div className="fps" data-testid="fps-counter">
        {hud.fps} FPS
      </div>

      <div className="chat" data-testid="chat-log">
        {hud.chat.slice(-12).map((c, i) => (
          <div key={i} className={`chat-line ${c.channel}`}>
            {c.text}
          </div>
        ))}
      </div>

      <div
        className={`xp-bar ${hud.rested ? 'rested' : ''}`}
        data-testid="xp-bar"
        title={`XP: ${hud.xp}/${xpNeed}  Rested: ${hud.restedXp}`}
      >
        {bubbles.map((f, i) => (
          <div key={i} className="xp-bubble">
            <div style={{ width: `${f * 100}%` }} />
          </div>
        ))}
      </div>

      <div className="action-bar" data-testid="action-bar">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='].map((k, i) => {
          const id = world.actionBar[i] || ''
          return (
            <div key={k} className="action-slot" data-testid={`action-slot-${i + 1}`}>
              <span className="key">{k}</span>
              <span className="icon">{labels[id] || ''}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
