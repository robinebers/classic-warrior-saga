import { SplitMix64 } from './rng/SplitMix64'
import {
  armorDR,
  attackPower,
  baseHpForLevel,
  healthFromStamina,
  mobAvgMelee,
  mobHp,
  orcWarriorBaseStats,
  rageFromDealing,
  rageFromTaking,
  rawMobXp,
  applyRestedXp,
  sheetCritPercent,
  sheetDodgePercent,
  weaponSwingDamage,
  xpToLevel,
} from './Formulas'
import { applyGlanceMultiplier, rollMobAttack, rollPlayerAttack } from './combat/AttackTable'
import {
  createAbilityRuntime,
  defaultActionBar,
  tickAbilityRuntime,
  tryCast,
  type AbilityRuntime,
} from './abilities/AbilityEngine'
import { ABILITIES } from './abilities/AbilityData'
import { QuestLog } from './quests/QuestLog'
import {
  isRestingAt,
  resolveRockCollision,
  sampleHeight,
  isWalkable,
  zoneAt,
  zoneName,
} from './world/Heightmap'
import type { EntityId } from './types'
import { EventBus, type Stance, type Vec3 } from './types'

export type AnimKind = 'idle' | 'run' | 'walk' | 'attack' | 'death'

export type PlayerState = {
  id: EntityId
  name: string
  level: number
  xp: number
  restedXp: number
  health: number
  maxHealth: number
  rage: number
  stance: Stance
  position: Vec3
  yaw: number
  str: number
  agi: number
  sta: number
  int: number
  spi: number
  ap: number
  critPct: number
  dodgePct: number
  armor: number
  inCombat: boolean
  targetId: EntityId | null
  copper: number
  playtimeSec: number
  weaponSkillAxes2H: number
  knownAbilities: Record<string, number>
  anim: AnimKind
  weaponMin: number
  weaponMax: number
  weaponSpeed: number
  parryUnlocked: boolean
  talents: Record<string, number>
}

export type MobState = {
  id: EntityId
  archetype: string
  name: string
  level: number
  elite: boolean
  health: number
  maxHealth: number
  position: Vec3
  yaw: number
  home: Vec3
  alive: boolean
  aggroTarget: EntityId | null
  swingTimer: number
  swingSpeed: number
  armor: number
  anim: AnimKind
  wanderT: number
  hasShield: boolean
}

export type Intent =
  | { type: 'move'; forward: number; strafe: number; turn: number }
  | { type: 'jump' }
  | { type: 'setYaw'; yaw: number }
  | { type: 'tabTarget' }
  | { type: 'clearTarget' }
  | { type: 'toggleAutoAttack' }
  | { type: 'useAbility'; slot: number }
  | { type: 'useAbilityId'; abilityId: string }
  | { type: 'debug'; cmd: string; args: string[] }

export const TICK_DT = 1 / 20
export const RUN_SPEED = 7.0
export const BACKPEDAL_SPEED = 4.5
export const GRAVITY = 19.29
export const JUMP_SPEED = 7.5

let nextId = 1
export function allocId(): EntityId {
  return nextId++
}

export function resetIdCounter(n = 1): void {
  nextId = n
}

export function createPlayer(name = 'Thrakmar'): PlayerState {
  const stats = orcWarriorBaseStats(1)
  const baseHp = baseHpForLevel(1)
  const maxHealth = healthFromStamina(baseHp, stats.sta)
  const level = 1
  return {
    id: allocId(),
    name,
    level,
    xp: 0,
    restedXp: 0,
    health: maxHealth,
    maxHealth,
    rage: 0,
    stance: 'battle',
    position: { x: 0, y: 0, z: 0 },
    yaw: 0,
    ...stats,
    ap: attackPower(stats.str, level),
    critPct: sheetCritPercent(stats.agi, level),
    dodgePct: sheetDodgePercent(stats.agi, level),
    armor: 36 + stats.agi * 2,
    inCombat: false,
    targetId: null,
    copper: 500,
    playtimeSec: 0,
    weaponSkillAxes2H: 5 * level + 5,
    knownAbilities: {
      attack: 1,
      battle_stance: 1,
      heroic_strike: 1,
      battle_shout: 1,
    },
    anim: 'idle',
    weaponMin: 2,
    weaponMax: 4,
    weaponSpeed: 1.9,
    parryUnlocked: false,
    talents: {},
  }
}

function learnAvailable(player: PlayerState): void {
  for (const def of ABILITIES) {
    const known = player.knownAbilities[def.id] ?? 0
    let best = known
    for (const r of def.ranks) {
      if (r.learnLevel <= player.level && r.rank > best) best = r.rank
    }
    if (best > known) {
      player.knownAbilities[def.id] = best
    }
  }
}

export type WorldOptions = { seed?: number }

export class World {
  readonly rng: SplitMix64
  readonly events = new EventBus()
  player: PlayerState
  mobs = new Map<EntityId, MobState>()
  private intents: Intent[] = []
  autoAttack = false
  private playerSwing = 0
  private verticalVel = 0
  private onGround = true
  private outOfCombatTimer = 0
  private moveIntent: Extract<Intent, { type: 'move' }> = {
    type: 'move',
    forward: 0,
    strafe: 0,
    turn: 0,
  }
  private attackAnimT = 0
  abilityRt: AbilityRuntime = createAbilityRuntime()
  actionBar: string[] = defaultActionBar()
  quests = new QuestLog()
  tickCount = 0
  timescale = 1

  constructor(opts: WorldOptions = {}) {
    this.rng = new SplitMix64(opts.seed ?? 42)
    resetIdCounter(1)
    this.player = createPlayer('Thrakmar')
    learnAvailable(this.player)
    this.quests.accept('boar_tusk_harvest')
    // Start near campfire in the valley bowl (not on top of the fire)
    this.player.position = { x: -6, y: sampleHeight(-6, 4), z: 4 }
  }

  queueIntent(i: Intent): void {
    this.intents.push(i)
  }

  drainEvents() {
    return this.events.drain()
  }

  spawnMob(
    archetype: string,
    name: string,
    level: number,
    pos: Vec3,
    elite = false,
  ): MobState {
    const hp = mobHp(level, elite)
    const mob: MobState = {
      id: allocId(),
      archetype,
      name,
      level,
      elite,
      health: hp,
      maxHealth: hp,
      position: { ...pos },
      yaw: this.rng.nextFloat() * Math.PI * 2,
      home: { ...pos },
      alive: true,
      aggroTarget: null,
      swingTimer: 0,
      swingSpeed: archetype === 'wolf' ? 1.6 : archetype.includes('ogre') ? 2.6 : 2.0,
      armor: level * 20,
      anim: 'idle',
      wanderT: this.rng.nextFloat() * 3,
      hasShield: archetype.includes('raider'),
    }
    this.mobs.set(mob.id, mob)
    return mob
  }

  tick(dt: number = TICK_DT): void {
    const steps = Math.max(1, Math.round((dt * this.timescale) / TICK_DT))
    for (let s = 0; s < steps; s++) this.fixedTick(TICK_DT)
  }

  private fixedTick(dt: number): void {
    this.tickCount++
    this.player.playtimeSec += dt
    this.processIntents()
    this.applyMovement(dt)
    this.updateMobs(dt)
    this.updateCombat(dt)
    this.tickAuras(dt)
    this.tickRested(dt)
    this.decayRage(dt)
    tickAbilityRuntime(this.abilityRt, dt)
    if (this.attackAnimT > 0) {
      this.attackAnimT -= dt
      if (this.attackAnimT <= 0 && this.player.anim === 'attack') {
        this.player.anim = 'idle'
      }
    }
  }

  private processIntents(): void {
    const batch = this.intents
    this.intents = []
    for (const i of batch) {
      switch (i.type) {
        case 'move':
          this.moveIntent = i
          break
        case 'setYaw':
          this.player.yaw = i.yaw
          break
        case 'jump':
          if (this.onGround) {
            this.verticalVel = JUMP_SPEED
            this.onGround = false
          }
          break
        case 'tabTarget':
          this.tabTarget()
          break
        case 'clearTarget':
          this.player.targetId = null
          this.events.push({ type: 'targetChanged', target: null })
          break
        case 'toggleAutoAttack':
          this.autoAttack = !this.autoAttack
          this.events.push({
            type: 'chat',
            channel: 'system',
            text: this.autoAttack ? 'Auto Attack On' : 'Auto Attack Off',
          })
          break
        case 'useAbility': {
          const id = this.actionBar[i.slot]
          if (id && id !== 'attack') this.castAbility(id)
          else if (id === 'attack') {
            this.autoAttack = true
          }
          break
        }
        case 'useAbilityId':
          this.castAbility(i.abilityId)
          break
        case 'debug':
          this.runDebug(i.cmd, i.args)
          break
        default:
          break
      }
    }
  }

  castAbility(abilityId: string): void {
    const p = this.player
    const target = p.targetId != null ? this.mobs.get(p.targetId) : undefined
    const result = tryCast(this.abilityRt, abilityId, {
      level: p.level,
      rage: p.rage,
      stance: p.stance,
      inCombat: p.inCombat,
      known: p.knownAbilities,
      talents: p.talents,
      targetHpPct: target ? target.health / target.maxHealth : null,
      hasShield: false,
    })
    if (!result.ok) {
      this.abilityRt.error = result.error
      this.events.push({ type: 'chat', channel: 'error', text: result.error })
      return
    }
    this.abilityRt.error = null
    if (result.queueNextSwing) {
      this.events.push({
        type: 'chat',
        channel: 'system',
        text: `${result.def.name} Queued.`,
      })
      return
    }

    if (result.consumeAllRage) {
      const extra = Math.max(0, p.rage - result.consumeRage)
      p.rage = 0
      this.resolveYellowHit(result.def.id, result.rank.effect + extra * (result.rank.effect2 ?? 0))
    } else {
      p.rage = Math.max(0, p.rage - result.consumeRage)
      this.applyAbilityEffect(result.def.id, result.rank)
    }
  }

  private applyAbilityEffect(id: string, rank: { effect: number; durationSec?: number; rageGen?: number }): void {
    const p = this.player
    const target = p.targetId != null ? this.mobs.get(p.targetId) : undefined
    switch (id) {
      case 'battle_shout':
        this.abilityRt.auras = this.abilityRt.auras.filter((a) => a.id !== 'battle_shout')
        this.abilityRt.auras.push({
          id: 'battle_shout',
          name: 'Battle Shout',
          remaining: rank.durationSec ?? 120,
          tickEvery: 999,
          tickAcc: 0,
          stacks: 1,
          apBonus: rank.effect,
          source: 'player',
          targetId: p.id,
        })
        p.ap = attackPower(p.str, p.level) + rank.effect
        this.events.push({ type: 'chat', channel: 'combat', text: 'You Gain Battle Shout.' })
        break
      case 'charge': {
        if (!target || !target.alive) {
          this.events.push({ type: 'chat', channel: 'error', text: 'Invalid Target' })
          return
        }
        const d = Math.sqrt(distSq(p.position, target.position))
        if (d < 8 || d > 25) {
          this.events.push({ type: 'chat', channel: 'error', text: 'Out Of Range.' })
          return
        }
        // snap toward target
        const dx = target.position.x - p.position.x
        const dz = target.position.z - p.position.z
        const len = Math.hypot(dx, dz) || 1
        p.position.x = target.position.x - (dx / len) * 2
        p.position.z = target.position.z - (dz / len) * 2
        p.yaw = Math.atan2(dx, -dz)
        p.rage = Math.min(100, p.rage + (rank.rageGen ?? 9))
        p.inCombat = true
        target.aggroTarget = p.id
        this.autoAttack = true
        this.events.push({
          type: 'chat',
          channel: 'combat',
          text: `You Charge ${target.name}.`,
        })
        break
      }
      case 'rend': {
        if (!target || !target.alive) {
          this.events.push({ type: 'chat', channel: 'error', text: 'Invalid Target' })
          return
        }
        const dur = rank.durationSec ?? 9
        this.abilityRt.auras = this.abilityRt.auras.filter(
          (a) => !(a.id === 'rend' && a.targetId === target.id),
        )
        this.abilityRt.auras.push({
          id: 'rend',
          name: 'Rend',
          remaining: dur,
          tickEvery: 3,
          tickAcc: 0,
          stacks: 1,
          totalDamage: rank.effect,
          source: 'player',
          targetId: target.id,
        })
        this.events.push({
          type: 'chat',
          channel: 'combat',
          text: `You Cast Rend On ${target.name}.`,
        })
        break
      }
      case 'thunder_clap': {
        let hits = 0
        for (const m of this.mobs.values()) {
          if (!m.alive) continue
          if (Math.sqrt(distSq(p.position, m.position)) > 8) continue
          const dmg = Math.max(1, rank.effect)
          m.health -= dmg
          hits++
          if (m.health <= 0) this.killMob(m)
        }
        this.events.push({
          type: 'chat',
          channel: 'combat',
          text: `Your Thunder Clap Hits ${hits} Enemies.`,
        })
        p.anim = 'attack'
        this.attackAnimT = 0.5
        break
      }
      case 'bloodrage': {
        const costHp = Math.floor(p.maxHealth * 0.16)
        p.health = Math.max(1, p.health - costHp)
        p.rage = Math.min(100, p.rage + 10)
        p.inCombat = true
        this.abilityRt.auras.push({
          id: 'bloodrage',
          name: 'Bloodrage',
          remaining: 10,
          tickEvery: 1,
          tickAcc: 0,
          stacks: 1,
          source: 'player',
          targetId: p.id,
        })
        this.events.push({ type: 'chat', channel: 'combat', text: 'You Activate Bloodrage.' })
        break
      }
      case 'hamstring':
      case 'overpower':
      case 'slam':
      case 'revenge':
        this.resolveYellowHit(id, rank.effect)
        if (id === 'overpower') this.abilityRt.overpowerWindow = 0
        if (id === 'revenge') this.abilityRt.revengeWindow = 0
        break
      case 'sunder_armor': {
        if (!target || !target.alive) {
          this.events.push({ type: 'chat', channel: 'error', text: 'Invalid Target' })
          return
        }
        const existing = this.abilityRt.auras.find(
          (a) => a.id === 'sunder_armor' && a.targetId === target.id,
        )
        if (existing) {
          existing.stacks = Math.min(5, existing.stacks + 1)
          existing.remaining = rank.durationSec ?? 30
        } else {
          this.abilityRt.auras.push({
            id: 'sunder_armor',
            name: 'Sunder Armor',
            remaining: rank.durationSec ?? 30,
            tickEvery: 999,
            tickAcc: 0,
            stacks: 1,
            source: 'player',
            targetId: target.id,
          })
        }
        const stacks =
          this.abilityRt.auras.find((a) => a.id === 'sunder_armor' && a.targetId === target.id)
            ?.stacks ?? 1
        target.armor = Math.max(0, target.armor - rank.effect)
        this.events.push({
          type: 'chat',
          channel: 'combat',
          text: `Your Sunder Armor Hits ${target.name} (${stacks} Stacks).`,
        })
        break
      }
      case 'demoralizing_shout': {
        let n = 0
        for (const m of this.mobs.values()) {
          if (!m.alive) continue
          if (Math.sqrt(distSq(p.position, m.position)) > 10) continue
          n++
        }
        this.events.push({
          type: 'chat',
          channel: 'combat',
          text: `Your Demoralizing Shout Hits ${n} Enemies.`,
        })
        break
      }
      case 'whirlwind': {
        let hits = 0
        for (const m of this.mobs.values()) {
          if (!m.alive) continue
          if (Math.sqrt(distSq(p.position, m.position)) > 8) continue
          if (hits >= 4) break
          const dmg = Math.max(
            1,
            Math.floor(
              weaponSwingDamage(p.weaponMin, p.weaponMax, p.weaponSpeed, p.ap, this.rng.nextFloat()),
            ),
          )
          m.health -= dmg
          hits++
          if (m.health <= 0) this.killMob(m)
        }
        p.anim = 'attack'
        this.attackAnimT = 0.6
        this.events.push({
          type: 'chat',
          channel: 'combat',
          text: `Your Whirlwind Hits ${hits} Enemies.`,
        })
        break
      }
      case 'intercept': {
        if (!target || !target.alive) {
          this.events.push({ type: 'chat', channel: 'error', text: 'Invalid Target' })
          return
        }
        if (!p.inCombat) {
          this.events.push({ type: 'chat', channel: 'error', text: 'Can Only Be Used In Combat' })
          return
        }
        const dx = target.position.x - p.position.x
        const dz = target.position.z - p.position.z
        const len = Math.hypot(dx, dz) || 1
        p.position.x = target.position.x - (dx / len) * 2
        p.position.z = target.position.z - (dz / len) * 2
        p.yaw = Math.atan2(dx, -dz)
        this.events.push({
          type: 'chat',
          channel: 'combat',
          text: `You Intercept ${target.name}.`,
        })
        break
      }
      case 'taunt': {
        if (!target || !target.alive) {
          this.events.push({ type: 'chat', channel: 'error', text: 'Invalid Target' })
          return
        }
        target.aggroTarget = p.id
        this.events.push({
          type: 'chat',
          channel: 'combat',
          text: `You Taunt ${target.name}.`,
        })
        break
      }
      case 'shield_block':
        this.events.push({ type: 'chat', channel: 'combat', text: 'You Raise Your Shield.' })
        break
      default:
        this.resolveYellowHit(id, rank.effect)
    }
  }

  private resolveYellowHit(abilityId: string, bonus: number): void {
    const p = this.player
    const target = p.targetId != null ? this.mobs.get(p.targetId) : undefined
    if (!target || !target.alive) {
      this.events.push({ type: 'chat', channel: 'error', text: 'Invalid Target' })
      return
    }
    let dmg = weaponSwingDamage(
      p.weaponMin,
      p.weaponMax,
      p.weaponSpeed,
      p.ap,
      this.rng.nextFloat(),
    ) + bonus
    if (this.rng.chance(p.critPct)) dmg *= 2
    const dr = armorDR(target.armor, p.level)
    dmg = Math.max(1, Math.floor(dmg * (1 - dr)))
    target.health -= dmg
    p.inCombat = true
    p.anim = 'attack'
    this.attackAnimT = 0.55
    const name = ABILITIES.find((a) => a.id === abilityId)?.name ?? abilityId
    this.events.push({
      type: 'meleeHit',
      source: p.id,
      target: target.id,
      damage: dmg,
      outcome: 'hit',
      yellow: true,
    })
    this.events.push({
      type: 'chat',
      channel: 'combat',
      text: `Your ${name} Hits ${target.name} For ${dmg}.`,
    })
    if (target.health <= 0) this.killMob(target)
  }

  private tickAuras(dt: number): void {
    for (const a of this.abilityRt.auras) {
      if (a.id === 'rend' && a.tickAcc >= a.tickEvery) {
        a.tickAcc = 0
        const ticks = Math.max(1, Math.round((a.remaining + a.tickEvery) / a.tickEvery))
        const tickDmg = Math.max(1, Math.floor((a.totalDamage ?? 0) / Math.max(1, ticks)))
        const mob = this.mobs.get(a.targetId)
        if (mob && mob.alive) {
          mob.health -= tickDmg
          this.events.push({
            type: 'chat',
            channel: 'combat',
            text: `${mob.name} Suffers ${tickDmg} From Your Rend.`,
          })
          if (mob.health <= 0) this.killMob(mob)
        }
      }
      if (a.id === 'bloodrage' && a.tickAcc >= 1) {
        a.tickAcc = 0
        this.player.rage = Math.min(100, this.player.rage + 1)
      }
    }
    void dt
  }

  private applyMovement(dt: number): void {
    const p = this.player
    if (p.anim === 'death') return
    p.yaw += this.moveIntent.turn * 2.5 * dt
    const forward = this.moveIntent.forward
    const strafe = this.moveIntent.strafe
    const speed = forward < 0 ? BACKPEDAL_SPEED : RUN_SPEED
    const len = Math.hypot(forward, strafe)
    let vx = 0
    let vz = 0
    if (len > 0.001) {
      const nx = forward / len
      const nz = strafe / len
      const sin = Math.sin(p.yaw)
      const cos = Math.cos(p.yaw)
      vx = (sin * nx + cos * nz) * speed
      vz = (-cos * nx + sin * nz) * speed
      if (this.attackAnimT <= 0) p.anim = 'run'
    } else if (this.attackAnimT <= 0) {
      p.anim = 'idle'
    }

    const tryX = p.position.x + vx * dt
    const tryZ = p.position.z + vz * dt
    const slid = resolveRockCollision(tryX, tryZ)
    if (isWalkable(slid.x, slid.z)) {
      p.position.x = slid.x
      p.position.z = slid.z
    } else if (isWalkable(p.position.x, slid.z)) {
      p.position.z = slid.z
    } else if (isWalkable(slid.x, p.position.z)) {
      p.position.x = slid.x
    }

    this.verticalVel -= GRAVITY * dt
    p.position.y += this.verticalVel * dt
    const groundY = sampleHeight(p.position.x, p.position.z)
    if (p.position.y <= groundY) {
      p.position.y = groundY
      this.verticalVel = 0
      this.onGround = true
    }
  }

  private tickRested(dt: number): void {
    // 5% of a level per 8 game-hours; 1 game-hour = 2 real minutes → accelerated
    // → 5% level / (8*120s) real ≈ per second rate
    if (!isRestingAt(this.player.position.x, this.player.position.z)) return
    if (this.player.inCombat) return
    const need = xpToLevel(this.player.level) || 400
    const cap = need * 1.5
    const perSec = (0.05 * need) / (8 * 120)
    this.player.restedXp = Math.min(cap, this.player.restedXp + perSec * dt)
  }

  currentZoneName(): string {
    return zoneName(zoneAt(this.player.position.x, this.player.position.z))
  }

  private updateMobs(dt: number): void {
    const p = this.player
    for (const m of this.mobs.values()) {
      if (!m.alive) {
        m.anim = 'death'
        continue
      }
      const d = Math.sqrt(distSq(p.position, m.position))
      const aggroR = Math.max(5, 20 - (p.level - m.level) + (m.level > p.level ? 2 * (m.level - p.level) : 0))

      if (m.aggroTarget == null && d < aggroR) {
        m.aggroTarget = p.id
        this.events.push({ type: 'chat', channel: 'combat', text: `${m.name} Aggros!` })
      }

      if (m.aggroTarget === p.id) {
        const leash = Math.sqrt(distSq(m.position, m.home))
        if (leash > 40) {
          m.aggroTarget = null
          m.health = m.maxHealth
          m.position = { ...m.home }
          m.anim = 'walk'
          this.events.push({ type: 'chat', channel: 'combat', text: `${m.name} Evades.` })
          continue
        }
        // chase
        const dx = p.position.x - m.position.x
        const dz = p.position.z - m.position.z
        const dist = Math.hypot(dx, dz) || 1
        m.yaw = Math.atan2(dx, -dz)
        if (dist > 2.2) {
          const spd = 5.5
          m.position.x += (dx / dist) * spd * dt
          m.position.z += (dz / dist) * spd * dt
          m.position.y = sampleHeight(m.position.x, m.position.z)
          m.anim = 'run'
        } else {
          m.anim = 'idle'
          m.swingTimer -= dt
          if (m.swingTimer <= 0) {
            m.swingTimer = m.swingSpeed
            this.resolveMobSwing(m)
          }
        }
      } else {
        // wander
        m.wanderT -= dt
        if (m.wanderT <= 0) {
          m.wanderT = 2 + this.rng.nextFloat() * 4
          m.yaw = this.rng.nextFloat() * Math.PI * 2
        }
        const spd = 1.2
        m.position.x += Math.sin(m.yaw) * spd * dt
        m.position.z += -Math.cos(m.yaw) * spd * dt
        // leash to home soft
        const hx = m.home.x - m.position.x
        const hz = m.home.z - m.position.z
        if (hx * hx + hz * hz > 12 * 12) {
          m.yaw = Math.atan2(hx, -hz)
        }
        m.position.y = sampleHeight(m.position.x, m.position.z)
        m.anim = 'walk'
      }
    }
  }

  private updateCombat(dt: number): void {
    if (!this.autoAttack || this.player.targetId == null) return
    const target = this.mobs.get(this.player.targetId)
    if (!target || !target.alive) return
    const d = Math.sqrt(distSq(this.player.position, target.position))
    if (d > 5) return
    this.playerSwing -= dt
    if (this.playerSwing <= 0) {
      this.playerSwing = this.player.weaponSpeed
      this.resolvePlayerSwing(target)
    }
  }

  private resolvePlayerSwing(target: MobState): void {
    const p = this.player
    const queued = this.abilityRt.nextSwingAbility
    const yellow = queued === 'heroic_strike' || queued === 'cleave'
    if (queued && yellow) {
      const cost = queued === 'cleave' ? 20 : 15
      if (p.rage < cost) {
        this.abilityRt.nextSwingAbility = null
      }
    }

    const defense = target.level * 5
    const skill = p.weaponSkillAxes2H
    const skillDiff = defense - skill
    const critBonus = p.talents.cruelty ?? 0
    const outcome = rollPlayerAttack(this.rng, {
      skillDiff,
      sheetCritPct: p.critPct + critBonus,
      white: !yellow,
      mobLevel: target.level,
      playerLevel: p.level,
      weaponSkill: skill,
      mobCanParry: false,
      mobCanBlock: target.hasShield,
      fromBehind: false,
    })

    p.anim = 'attack'
    this.attackAnimT = 0.6
    this.events.push({ type: 'anim', entity: p.id, clip: 'attack' })

    if (outcome === 'miss' || outcome === 'dodge' || outcome === 'parry' || outcome === 'block') {
      if (outcome === 'dodge') this.abilityRt.overpowerWindow = 5
      this.events.push({
        type: 'chat',
        channel: 'combat',
        text: `Your ${yellow ? 'Heroic Strike' : 'Auto Attack'} ${outcome === 'miss' ? 'Misses' : `Is ${titleCase(outcome)}ed By`} ${target.name}.`,
      })
      this.events.push({
        type: 'meleeHit',
        source: p.id,
        target: target.id,
        damage: 0,
        outcome,
        yellow,
      })
      if (yellow) this.abilityRt.nextSwingAbility = null
      return
    }

    let bonus = 0
    let label = 'Auto Attack'
    if (yellow && this.abilityRt.nextSwingAbility) {
      const qid = this.abilityRt.nextSwingAbility
      const rankN = p.knownAbilities[qid] ?? 1
      const def = ABILITIES.find((a) => a.id === qid)
      bonus = def?.ranks.find((r) => r.rank === rankN)?.effect ?? 11
      p.rage = Math.max(0, p.rage - Math.max(0, (qid === 'cleave' ? 20 : 15) - (qid === 'heroic_strike' ? (p.talents.improved_heroic_strike ?? 0) : 0)))
      this.abilityRt.nextSwingAbility = null
      label = def?.name ?? 'Ability'
      // Cleave secondary target
      if (qid === 'cleave') {
        for (const m of this.mobs.values()) {
          if (!m.alive || m.id === target.id) continue
          if (Math.sqrt(distSq(p.position, m.position)) > 5) continue
          const secondary = Math.max(1, Math.floor(bonus))
          m.health -= secondary
          this.events.push({
            type: 'chat',
            channel: 'combat',
            text: `Your Cleave Also Hits ${m.name} For ${secondary}.`,
          })
          if (m.health <= 0) this.killMob(m)
          break
        }
      }
    }

    let dmg = weaponSwingDamage(
      p.weaponMin,
      p.weaponMax,
      p.weaponSpeed,
      p.ap,
      this.rng.nextFloat(),
    ) + bonus
    if (outcome === 'glancing') {
      dmg = applyGlanceMultiplier(dmg, target.level - p.level)
    }
    if (outcome === 'crit') dmg *= 2
    const dr = armorDR(target.armor, p.level)
    dmg = Math.max(1, Math.floor(dmg * (1 - dr)))

    target.health -= dmg
    p.inCombat = true
    this.outOfCombatTimer = 0
    if (!yellow) {
      const rage = rageFromDealing(dmg, p.level)
      p.rage = Math.min(100, p.rage + rage)
      this.events.push({ type: 'rageChanged', entity: p.id, rage: p.rage, delta: rage })
    }
    this.events.push({
      type: 'meleeHit',
      source: p.id,
      target: target.id,
      damage: dmg,
      outcome,
      yellow,
    })
    const verb = outcome === 'crit' ? 'Crits' : 'Hits'
    this.events.push({
      type: 'chat',
      channel: 'combat',
      text: `Your ${label} ${verb} ${target.name} For ${dmg}${outcome === 'crit' ? '!' : '.'}`,
    })
    if (target.health <= 0) this.killMob(target)
  }

  private resolveMobSwing(mob: MobState): void {
    const p = this.player
    if (p.anim === 'death') return
    const defense = p.level * 5
    const skill = mob.level * 5
    const outcome = rollMobAttack(this.rng, {
      skillDiff: defense - skill,
      playerDodgePct: p.dodgePct,
      playerParryPct: p.parryUnlocked ? 5 : 0,
      playerBlockPct: 0,
      fromBehind: false,
      canCrush: mob.level >= p.level + 4,
    })
    mob.anim = 'attack'
    if (outcome === 'miss' || outcome === 'dodge' || outcome === 'parry' || outcome === 'block') {
      this.events.push({
        type: 'chat',
        channel: 'combat',
        text: `${mob.name} ${outcome === 'miss' ? 'Misses You' : `Is ${titleCase(outcome)}ed`}.`,
      })
      return
    }
    let dmg = mobAvgMelee(mob.level) * (0.75 + this.rng.nextFloat() * 0.5)
    if (outcome === 'crit' || outcome === 'crushing') dmg *= 1.5
    const dr = armorDR(p.armor, mob.level)
    dmg = Math.max(1, Math.floor(dmg * (1 - dr)))
    p.health = Math.max(0, p.health - dmg)
    p.inCombat = true
    this.outOfCombatTimer = 0
    const rage = rageFromTaking(dmg, p.level)
    p.rage = Math.min(100, p.rage + rage)
    this.events.push({
      type: 'chat',
      channel: 'combat',
      text: `${mob.name} Hits You For ${dmg}.`,
    })
    if (p.health <= 0) {
      p.anim = 'death'
      this.events.push({ type: 'entityDied', entity: p.id })
      this.events.push({ type: 'chat', channel: 'system', text: 'You Have Died.' })
    }
  }

  killMob(mob: MobState): void {
    mob.alive = false
    mob.health = 0
    mob.anim = 'death'
    mob.aggroTarget = null
    this.events.push({ type: 'entityDied', entity: mob.id })
    this.events.push({ type: 'anim', entity: mob.id, clip: 'death' })
    const raw = rawMobXp(this.player.level, mob.level, mob.elite)
    const { awarded, restedLeft } = applyRestedXp(raw, this.player.restedXp)
    this.player.restedXp = restedLeft
    this.player.copper += Math.floor(mob.level * (5 + this.rng.nextFloat() * 10))
    if (awarded > 0) this.addXp(awarded)
    this.events.push({
      type: 'chat',
      channel: 'system',
      text: `${mob.name} Dies. You Gain ${awarded} Experience.`,
    })
    for (const line of this.quests.onKill(mob.archetype)) {
      this.events.push({ type: 'chat', channel: 'system', text: line })
    }
  }

  acceptQuest(questId: string): void {
    const err = this.quests.accept(questId)
    if (err) {
      this.events.push({ type: 'chat', channel: 'error', text: err })
      return
    }
    const def = this.quests.def(questId)
    this.events.push({
      type: 'chat',
      channel: 'system',
      text: `Accepted: ${def?.title ?? questId}`,
    })
  }

  turnInQuest(questId: string): void {
    const res = this.quests.turnIn(questId)
    if (!res.ok) {
      this.events.push({ type: 'chat', channel: 'error', text: res.error })
      return
    }
    this.addXp(res.def.xpReward)
    this.player.copper += res.def.copperReward
    this.events.push({
      type: 'chat',
      channel: 'system',
      text: `Completed: ${res.def.title} (+${res.def.xpReward} XP)`,
    })
    if (questId === 'a_warriors_shield') {
      this.player.knownAbilities.defensive_stance = 1
      this.player.knownAbilities.sunder_armor = 1
      this.player.knownAbilities.taunt = 1
      this.events.push({
        type: 'chat',
        channel: 'system',
        text: 'You Have Learned Defensive Stance, Sunder Armor, And Taunt.',
      })
    }
    if (questId === 'test_of_fury') {
      this.player.knownAbilities.berserker_stance = 1
      this.player.knownAbilities.intercept = 1
      this.events.push({
        type: 'chat',
        channel: 'system',
        text: 'You Have Learned Berserker Stance And Intercept.',
      })
    }
  }

  switchStance(stance: Stance): void {
    if (this.player.stance === stance) return
    if (stance === 'defensive' && !(this.player.knownAbilities.defensive_stance > 0)) {
      this.events.push({ type: 'chat', channel: 'error', text: 'You Have Not Learned Defensive Stance' })
      return
    }
    if (stance === 'berserker' && !(this.player.knownAbilities.berserker_stance > 0)) {
      this.events.push({ type: 'chat', channel: 'error', text: 'You Have Not Learned Berserker Stance' })
      return
    }
    if (this.abilityRt.stanceCdRemaining > 0) {
      this.events.push({ type: 'chat', channel: 'error', text: 'Ability Not Ready Yet' })
      return
    }
    const retain = 5 * (this.player.talents.tactical_mastery ?? 0)
    this.player.rage = Math.min(this.player.rage, retain)
    this.player.stance = stance
    this.abilityRt.stanceCdRemaining = 1
    const label =
      stance === 'battle' ? 'Battle Stance' : stance === 'defensive' ? 'Defensive Stance' : 'Berserker Stance'
    this.events.push({ type: 'chat', channel: 'system', text: `You Enter ${label}.` })
  }

  private decayRage(dt: number): void {
    if (this.player.inCombat) {
      // leave combat if no nearby aggro
      let any = false
      for (const m of this.mobs.values()) {
        if (m.alive && m.aggroTarget === this.player.id) {
          any = true
          break
        }
      }
      if (!any && !this.autoAttack) {
        this.outOfCombatTimer += dt
        if (this.outOfCombatTimer > 5) this.player.inCombat = false
      } else {
        this.outOfCombatTimer = 0
      }
      return
    }
    this.outOfCombatTimer += dt
    if (this.outOfCombatTimer > 5 && this.player.rage > 0) {
      this.player.rage = Math.max(0, this.player.rage - dt)
    }
  }

  private tabTarget(): void {
    const p = this.player
    let best: MobState | null = null
    let bestD = Infinity
    for (const m of this.mobs.values()) {
      if (!m.alive) continue
      const d = distSq(p.position, m.position)
      if (d < bestD && d < 40 * 40) {
        bestD = d
        best = m
      }
    }
    p.targetId = best?.id ?? null
    this.events.push({ type: 'targetChanged', target: p.targetId })
  }

  private runDebug(cmd: string, args: string[]): void {
    switch (cmd) {
      case 'setlevel': {
        const n = Number(args[0] || 1)
        this.applyLevel(Math.min(60, Math.max(1, n)))
        break
      }
      case 'addxp':
        this.addXp(Number(args[0] || 0))
        break
      case 'spawn': {
        const arch = args[0] || 'bristleboar'
        const lvl = Number(args[1] || this.player.level)
        const pos = {
          x: this.player.position.x + Math.sin(this.player.yaw) * 5,
          y: this.player.position.y,
          z: this.player.position.z - Math.cos(this.player.yaw) * 5,
        }
        this.spawnMob(arch, titleCase(arch), lvl, pos, args.includes('elite'))
        this.events.push({
          type: 'chat',
          channel: 'system',
          text: `Spawned ${arch} L${lvl}`,
        })
        break
      }
      case 'god':
        this.player.health = this.player.maxHealth
        this.player.anim = 'idle'
        break
      case 'timescale':
        this.timescale = Number(args[0] || 1)
        break
      case 'acceptquest':
        this.acceptQuest(args[0] || 'boar_tusk_harvest')
        break
      case 'turnin':
        this.turnInQuest(args[0] || '')
        break
      case 'stance': {
        const s = (args[0] || 'battle').toLowerCase()
        this.switchStance(
          s === 'defensive' || s === 'd'
            ? 'defensive'
            : s === 'berserker' || s === 'z'
              ? 'berserker'
              : 'battle',
        )
        break
      }
      case 'killtarget': {
        const t =
          this.player.targetId != null ? this.mobs.get(this.player.targetId) : undefined
        if (t) this.killMob(t)
        break
      }
      case 'rested':
        this.player.restedXp = Number(args[0] || xpToLevel(this.player.level) * 1.5)
        break
      default:
        this.events.push({ type: 'chat', channel: 'error', text: `Unknown Command: ${cmd}` })
    }
  }

  addXp(amount: number): void {
    if (amount <= 0 || this.player.level >= 60) return
    this.player.xp += amount
    this.events.push({ type: 'xpGained', amount, rested: false })
    while (this.player.level < 60 && this.player.xp >= xpToLevel(this.player.level)) {
      this.player.xp -= xpToLevel(this.player.level)
      this.applyLevel(this.player.level + 1)
    }
  }

  applyLevel(level: number): void {
    const stats = orcWarriorBaseStats(level)
    const baseHp = baseHpForLevel(level)
    this.player.level = level
    Object.assign(this.player, stats)
    this.player.maxHealth = healthFromStamina(baseHp, stats.sta)
    this.player.health = this.player.maxHealth
    this.player.ap = attackPower(stats.str, level)
    this.player.critPct = sheetCritPercent(stats.agi, level)
    this.player.dodgePct = sheetDodgePercent(stats.agi, level)
    this.player.armor = 36 + stats.agi * 2
    this.player.weaponSkillAxes2H = 5 * level + 5
    if (level >= 6) this.player.parryUnlocked = true
    learnAvailable(this.player)
    // Quest/vendor weapon upgrades by level (tunable feel — logged A5)
    this.player.weaponMin = Math.floor(3 + level * 1.6)
    this.player.weaponMax = Math.floor(6 + level * 2.4)
    this.player.weaponSpeed = level >= 4 ? 2.8 : 1.9
    this.events.push({ type: 'levelUp', level })
    this.events.push({
      type: 'chat',
      channel: 'system',
      text: `Congratulations, You Have Reached Level ${level}!`,
    })
    if (ABILITIES.some((a) => a.ranks.some((r) => r.learnLevel === level))) {
      this.events.push({
        type: 'chat',
        channel: 'system',
        text: 'New Ability Available At Your Trainer!',
      })
    }
  }
}

function distSq(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x
  const dz = a.z - b.z
  return dx * dx + dz * dz
}

function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
