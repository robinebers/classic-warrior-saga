import { describe, expect, it } from 'vitest'
import { World } from '../World'
import { stanceAllows, abilityById } from './AbilityData'
import { tryCast, createAbilityRuntime } from './AbilityEngine'

describe('abilities', () => {
  it('stance gating', () => {
    expect(stanceAllows('B', 'battle')).toBe(true)
    expect(stanceAllows('B', 'defensive')).toBe(false)
    expect(stanceAllows('BDZ', 'berserker')).toBe(true)
  })

  it('charge unlocks at 4 and generates rage', () => {
    const w = new World({ seed: 3 })
    w.applyLevel(4)
    expect(w.player.knownAbilities.charge).toBe(1)
    w.spawnMob('bristleboar', 'Bristleboar', 4, {
      x: w.player.position.x + Math.sin(w.player.yaw) * 12,
      y: 0,
      z: w.player.position.z - Math.cos(w.player.yaw) * 12,
    })
    w.queueIntent({ type: 'tabTarget' })
    w.tick(0.05)
    const before = w.player.rage
    w.queueIntent({ type: 'useAbilityId', abilityId: 'charge' })
    w.tick(0.05)
    expect(w.player.rage).toBeGreaterThan(before)
    expect(w.player.inCombat).toBe(true)
  })

  it('heroic strike queues on next swing', () => {
    const w = new World({ seed: 4 })
    w.player.rage = 50
    w.spawnMob('bristleboar', 'Boar', 1, { x: 2, y: 0, z: 0 })
    w.queueIntent({ type: 'tabTarget' })
    w.tick(0.05)
    w.queueIntent({ type: 'useAbilityId', abilityId: 'heroic_strike' })
    w.tick(0.05)
    expect(w.abilityRt.nextSwingAbility).toBe('heroic_strike')
  })

  it('not enough rage errors', () => {
    const rt = createAbilityRuntime()
    const res = tryCast(rt, 'thunder_clap', {
      level: 6,
      rage: 0,
      stance: 'battle',
      inCombat: true,
      known: { thunder_clap: 1 },
      targetHpPct: 1,
      hasShield: false,
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toBe('Not Enough Rage')
  })

  it('ability data has charge ranks', () => {
    const c = abilityById('charge')
    expect(c?.ranks).toHaveLength(3)
  })
})
