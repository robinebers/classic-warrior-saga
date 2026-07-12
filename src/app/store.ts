import { isRestingAt } from '@game-core/world/Heightmap'
import { create } from 'zustand'
import { World } from '@game-core/World'
import type { GameEvent } from '@game-core/types'

type HudSnapshot = {
  level: number
  xp: number
  xpToLevel: number
  restedXp: number
  rested: boolean
  health: number
  maxHealth: number
  rage: number
  targetName: string | null
  targetHpPct: number | null
  zoneName: string
  resting: boolean
  chat: { channel: string; text: string }[]
  fps: number
  errorText: string | null
}

type GameStore = {
  world: World
  hud: HudSnapshot
  started: boolean
  pushChat: (channel: string, text: string) => void
  syncFromWorld: () => void
  setFps: (fps: number) => void
  setError: (text: string | null) => void
  handleEvents: (events: GameEvent[]) => void
  start: () => void
}

function emptyHud(): HudSnapshot {
  return {
    level: 1,
    xp: 0,
    xpToLevel: 400,
    restedXp: 0,
    rested: false,
    health: 80,
    maxHealth: 80,
    rage: 0,
    targetName: null,
    targetHpPct: null,
    zoneName: 'Valley Of Trials',
    resting: false,
    chat: [],
    fps: 0,
    errorText: null,
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  world: new World({ seed: 42 }),
  hud: emptyHud(),
  started: false,
  pushChat: (channel, text) =>
    set((s) => ({
      hud: { ...s.hud, chat: [...s.hud.chat.slice(-100), { channel, text }] },
    })),
  syncFromWorld: () => {
    const w = get().world
    const p = w.player
    const target = p.targetId != null ? w.mobs.get(p.targetId) : undefined
    set((s) => ({
      hud: {
        ...s.hud,
        level: p.level,
        xp: p.xp,
        xpToLevel: p.level >= 60 ? 0 : requireXp(p.level),
        restedXp: Math.floor(p.restedXp),
        rested: p.restedXp > 0,
        health: Math.floor(p.health),
        maxHealth: p.maxHealth,
        rage: Math.floor(p.rage),
        targetName: target?.name ?? null,
        targetHpPct: target ? target.health / target.maxHealth : null,
        zoneName: w.currentZoneName(),
        resting: isRestingAt(p.position.x, p.position.z) && !p.inCombat,
      },
    }))
  },
  setFps: (fps) => set((s) => ({ hud: { ...s.hud, fps } })),
  setError: (text) => set((s) => ({ hud: { ...s.hud, errorText: text } })),
  handleEvents: (events) => {
    for (const e of events) {
      if (e.type === 'chat') get().pushChat(e.channel, e.text)
      if (e.type === 'levelUp') get().setError(null)
    }
    const err = get().world.abilityRt.error
    if (err) get().setError(err)
    get().syncFromWorld()
  },
  start: () => {
    const w = get().world
    w.spawnMob('bristleboar', 'Bristleboar', 1, { x: 8, y: 0, z: -6 })
    w.spawnMob('bristleboar', 'Bristleboar', 2, { x: -5, y: 0, z: -10 })
    w.spawnMob('venomtail_scorpid', 'Venomtail Scorpid', 3, { x: 12, y: 0, z: 4 })
    get().pushChat('system', 'Welcome To The Valley Of Trials, Warrior.')
    get().pushChat(
      'system',
      'WASD Move · Q/E Strafe · Mouse Look · Tab Target · T Attack · 1-0 Abilities · N Talents · K Trainer · Space Jump · ~ Console',
    )
    set({ started: true })
    get().syncFromWorld()
  },
}))

function requireXp(level: number): number {
  // inline tiny table edge to avoid store import cycles
  const table: Record<number, number> = {
    1: 400, 2: 900, 3: 1400, 4: 2100, 5: 2800, 6: 3600, 7: 4500, 8: 5400, 9: 6500, 10: 7600,
  }
  return table[level] ?? 400
}
