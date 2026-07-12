import { World } from '../World'
import { TOTAL_XP_1_TO_60, xpToLevel } from '../Formulas'

export type SimReport = {
  reachedLevel: number
  playtimeSec: number
  deaths: number
  goldCopper: number
  xpConsumed: number
  invariantViolations: number
}

/**
 * Headless leveling bot — fights nearest mob, eats conceptually at low HP,
 * trains via auto-learn on ding. Straight-line chase with jitter.
 */
export function runSimBot(opts: {
  seed?: number
  targetLevel?: number
  maxSimSeconds?: number
}): SimReport {
  const targetLevel = opts.targetLevel ?? 10
  const maxSimSeconds = opts.maxSimSeconds ?? 90 * 60
  const w = new World({ seed: opts.seed ?? 42 })
  let deaths = 0
  let violations = 0
  let xpConsumed = 0
  const startXp = 0

  // denser starter farm
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2
    w.spawnMob('bristleboar', 'Bristleboar', 1 + (i % 3), {
      x: Math.cos(ang) * (8 + (i % 4)),
      y: 0,
      z: Math.sin(ang) * (8 + (i % 4)),
    })
  }

  const dt = 0.05
  let t = 0
  while (t < maxSimSeconds && w.player.level < targetLevel) {
    if (w.player.health <= 0) {
      deaths++
      w.player.health = w.player.maxHealth
      w.player.anim = 'idle'
      w.player.position = { x: 0, y: 0, z: 0 }
    }

    // find nearest alive mob
    let best = null as null | { id: number; d: number }
    for (const m of w.mobs.values()) {
      if (!m.alive) continue
      const dx = m.position.x - w.player.position.x
      const dz = m.position.z - w.player.position.z
      const d = Math.hypot(dx, dz)
      if (!best || d < best.d) best = { id: m.id, d }
    }

    if (best) {
      w.player.targetId = best.id
      const m = w.mobs.get(best.id)!
      const dx = m.position.x - w.player.position.x
      const dz = m.position.z - w.player.position.z
      const d = Math.hypot(dx, dz) || 1
      w.player.yaw = Math.atan2(dx, -dz)
      if (d > 2.5) {
        w.queueIntent({ type: 'move', forward: 1, strafe: 0, turn: 0 })
      } else {
        w.queueIntent({ type: 'move', forward: 0, strafe: 0, turn: 0 })
        if (!w.autoAttack) w.queueIntent({ type: 'toggleAutoAttack' })
        // dump HS if rage
        if (w.player.rage >= 15) {
          w.queueIntent({ type: 'useAbilityId', abilityId: 'heroic_strike' })
        }
        if ((w.player.knownAbilities.rend ?? 0) > 0 && w.player.rage >= 10) {
          w.queueIntent({ type: 'useAbilityId', abilityId: 'rend' })
        }
      }
    } else {
      // respawn farm
      for (let i = 0; i < 6; i++) {
        w.spawnMob('bristleboar', 'Bristleboar', Math.min(w.player.level, 3), {
          x: w.player.position.x + (Math.random() - 0.5) * 20,
          y: 0,
          z: w.player.position.z + (Math.random() - 0.5) * 20,
        })
      }
    }

    const levelBefore = w.player.level
    const xpBefore = w.player.xp
    w.tick(dt)
    t += dt

    if (w.player.level > levelBefore) {
      for (let l = levelBefore; l < w.player.level; l++) xpConsumed += xpToLevel(l)
      xpConsumed += xpBefore // leftover from previous level counted oddly — simplify below
    }

    if (w.player.rage < 0 || w.player.health < 0) violations++
    if (w.player.rage > 100) violations++
  }

  // recompute xp consumed cleanly
  xpConsumed = 0
  for (let l = 1; l < w.player.level; l++) xpConsumed += xpToLevel(l)
  xpConsumed += w.player.xp
  void startXp
  void TOTAL_XP_1_TO_60

  return {
    reachedLevel: w.player.level,
    playtimeSec: t,
    deaths,
    goldCopper: w.player.copper,
    xpConsumed,
    invariantViolations: violations,
  }
}
