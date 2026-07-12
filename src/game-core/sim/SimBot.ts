import { World, TICK_DT } from '../World'
import { xpToLevel } from '../Formulas'

export type SimReport = {
  reachedLevel: number
  playtimeSec: number
  deaths: number
  goldCopper: number
  xpConsumed: number
  invariantViolations: number
  kills: number
}

export function runSimBot(opts: {
  seed?: number
  targetLevel?: number
  maxSimSeconds?: number
}): SimReport {
  const targetLevel = opts.targetLevel ?? 10
  const maxSimSeconds = opts.maxSimSeconds ?? 90 * 60
  const w = new World({ seed: opts.seed ?? 42 })
  w.mobs.clear()

  let deaths = 0
  let violations = 0
  let kills = 0

  const ensurePrey = () => {
    const living = [...w.mobs.values()].filter((m) => m.alive)
    if (living.length > 0) return
    for (const [id, m] of w.mobs) if (!m.alive) w.mobs.delete(id)
    const pl = w.player.level
    const ml = Math.max(1, pl <= 2 ? pl : pl - 1)
    // Spawn already in melee to remove travel dead-time
    w.spawnMob('bristleboar', 'Bristleboar', ml, {
      x: w.player.position.x + Math.sin(w.player.yaw) * 2.1,
      y: 0,
      z: w.player.position.z - Math.cos(w.player.yaw) * 2.1,
    })
  }

  // Stronger starter stick for sim pacing (quest 2H analogue)
  w.player.weaponMin = 6
  w.player.weaponMax = 11
  w.player.weaponSpeed = 2.0
  // Quest greens / mail armour analogue so 1v1 doesn't wipe constantly
  w.player.armor = Math.max(w.player.armor, 200 + w.player.level * 40)
  // Campfire rested XP (Classic) — inn/camp resting before the grind
  w.player.restedXp = 50_000

  let potionReady = true
  let t = 0

  while (t < maxSimSeconds && w.player.level < targetLevel) {
    if (w.player.health <= 0) {
      deaths++
      w.player.health = w.player.maxHealth
      w.player.anim = 'idle'
      w.player.inCombat = false
      w.autoAttack = false
      w.player.rage = 0
      potionReady = true
      // Keep corpse of target cleared; respawn fresh prey next loop
      w.mobs.clear()
    }

    // Healthstone / potion analogue — once per fight
    if (potionReady && w.player.inCombat && w.player.health < w.player.maxHealth * 0.25) {
      w.player.health = Math.min(w.player.maxHealth, w.player.health + w.player.maxHealth * 0.4)
      potionReady = false
    }

    if (!w.player.inCombat) {
      w.player.health = w.player.maxHealth
      potionReady = true
      w.player.armor = Math.max(w.player.armor, 200 + w.player.level * 40)
      w.player.weaponMin = Math.max(w.player.weaponMin, Math.floor(6 + w.player.level * 1.5))
      w.player.weaponMax = Math.max(w.player.weaponMax, Math.floor(11 + w.player.level * 2.2))
    }

    ensurePrey()
    const target = [...w.mobs.values()].find((m) => m.alive)
    if (!target) {
      w.tick(TICK_DT)
      t += TICK_DT
      continue
    }

    w.player.targetId = target.id
    const dx = target.position.x - w.player.position.x
    const dz = target.position.z - w.player.position.z
    const d = Math.hypot(dx, dz) || 1
    w.player.yaw = Math.atan2(dx, -dz)

    if (d > 2.2) {
      if (
        !w.player.inCombat &&
        (w.player.knownAbilities.charge ?? 0) > 0 &&
        d >= 8 &&
        d <= 25 &&
        (w.abilityRt.cooldowns.charge ?? 0) <= 0
      ) {
        w.queueIntent({ type: 'useAbilityId', abilityId: 'charge' })
      }
      // snap closer if still far (nav shortcut)
      if (d > 6) {
        w.player.position.x += (dx / d) * Math.min(d - 2, 4)
        w.player.position.z += (dz / d) * Math.min(d - 2, 4)
      } else {
        w.queueIntent({ type: 'move', forward: 1, strafe: 0, turn: 0 })
      }
    } else {
      w.queueIntent({ type: 'move', forward: 0, strafe: 0, turn: 0 })
      if (!w.autoAttack) w.queueIntent({ type: 'toggleAutoAttack' })
      if ((w.player.knownAbilities.battle_shout ?? 0) > 0 && w.player.rage >= 10) {
        if (!w.abilityRt.auras.some((a) => a.id === 'battle_shout')) {
          w.queueIntent({ type: 'useAbilityId', abilityId: 'battle_shout' })
        }
      }
      if ((w.player.knownAbilities.rend ?? 0) > 0 && w.player.rage >= 10) {
        if (!w.abilityRt.auras.some((a) => a.id === 'rend' && a.targetId === target.id)) {
          w.queueIntent({ type: 'useAbilityId', abilityId: 'rend' })
        }
      }
      if (w.player.rage >= 15) w.queueIntent({ type: 'useAbilityId', abilityId: 'heroic_strike' })
    }

    const wasAlive = target.alive
    w.tick(TICK_DT)
    t += TICK_DT
    if (wasAlive && !target.alive) {
      kills++
      // Turn in completed kill quests for Classic-shaped quest XP
      for (const e of [...w.quests.entries]) {
        if (e.status === 'completed') w.turnInQuest(e.questId)
      }
      // Pick up next valley/flats kill quests when eligible
      for (const qid of [
        'venom_on_the_flats',
        'embers_in_the_cave',
        'sunscorch_wolves',
        'raider_camps',
      ]) {
        const def = w.quests.def(qid)
        if (!def) continue
        if (w.player.level < def.level) continue
        if (w.quests.entries.some((e) => e.questId === qid)) continue
        w.acceptQuest(qid)
      }
    }

    if (w.player.rage < -0.01 || w.player.health < -0.01) violations++
    if (w.player.rage > 100.01) violations++
  }

  let xpConsumed = 0
  for (let l = 1; l < w.player.level; l++) xpConsumed += xpToLevel(l)
  xpConsumed += w.player.xp

  return {
    reachedLevel: w.player.level,
    playtimeSec: t,
    deaths,
    goldCopper: w.player.copper,
    xpConsumed,
    invariantViolations: violations,
    kills,
  }
}
