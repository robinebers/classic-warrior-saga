import { describe, expect, it } from 'vitest'
import { World } from './World'
import { SplitMix64 } from './rng/SplitMix64'
import { readFileSync } from 'node:fs'
import { assertNoNetworkingImports } from './offlineGuard'

describe('SplitMix64', () => {
  it('is deterministic', () => {
    const a = new SplitMix64(123)
    const b = new SplitMix64(123)
    expect(a.nextFloat()).toBe(b.nextFloat())
    expect(a.nextInt(1, 100)).toBe(b.nextInt(1, 100))
  })
})

describe('World smoke', () => {
  it('spawns and moves', () => {
    const w = new World({ seed: 7 })
    expect(w.player.maxHealth).toBe(80)
    w.spawnMob('bristleboar', 'Bristleboar', 1, { x: 3, y: 0, z: 0 })
    expect(w.mobs.size).toBe(1)
    w.queueIntent({ type: 'move', forward: 1, strafe: 0, turn: 0 })
    const x0 = w.player.position.x
    w.tick(0.5)
    expect(w.player.position.x !== x0 || w.player.position.z !== 0).toBe(true)
  })

  it('ding via addxp', () => {
    const w = new World({ seed: 1 })
    w.addXp(400)
    expect(w.player.level).toBe(2)
    const ev = w.drainEvents()
    expect(ev.some((e) => e.type === 'levelUp')).toBe(true)
  })

  it('debug spawn + tab + attack', () => {
    const w = new World({ seed: 2 })
    w.queueIntent({ type: 'debug', cmd: 'spawn', args: ['bristleboar', '1'] })
    w.tick(0.05)
    expect(w.mobs.size).toBe(1)
    w.queueIntent({ type: 'tabTarget' })
    w.tick(0.05)
    expect(w.player.targetId).not.toBeNull()
    w.queueIntent({ type: 'toggleAutoAttack' })
    for (let i = 0; i < 60; i++) w.tick(0.05)
    const t = [...w.mobs.values()][0]
    expect(t.health).toBeLessThan(t.maxHealth)
  })
})

describe('offline guard', () => {
  it('game-core Formulas has no networking symbols', () => {
    const src = readFileSync(new URL('./Formulas.ts', import.meta.url), 'utf8')
    expect(assertNoNetworkingImports(src)).toBe(true)
  })

  it('World has no networking symbols', () => {
    const src = readFileSync(new URL('./World.ts', import.meta.url), 'utf8')
    expect(assertNoNetworkingImports(src)).toBe(true)
  })
})
