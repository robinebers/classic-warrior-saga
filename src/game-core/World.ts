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
    copper: 0,
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
  tickCount = 0
  timescale = 1

  constructor(opts: WorldOptions = {}) {
    this.rng = new SplitMix64(opts.seed ?? 42)
    resetIdCounter(1)
    this.player = createPlayer('Thrakmar')
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
    this.decayRage(dt)
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
        case 'debug':
          this.runDebug(i.cmd, i.args)
          break
        default:
          break
      }
    }
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
    p.position.x += vx * dt
    p.position.z += vz * dt

    this.verticalVel -= GRAVITY * dt
    p.position.y += this.verticalVel * dt
    const groundY = sampleHeight(p.position.x, p.position.z)
    if (p.position.y <= groundY) {
      p.position.y = groundY
      this.verticalVel = 0
      this.onGround = true
    }
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
    const defense = target.level * 5
    const skill = p.weaponSkillAxes2H
    const skillDiff = defense - skill
    const outcome = rollPlayerAttack(this.rng, {
      skillDiff,
      sheetCritPct: p.critPct,
      white: true,
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
      this.events.push({
        type: 'chat',
        channel: 'combat',
        text: `Your Auto Attack ${outcome === 'miss' ? 'Misses' : `Is ${titleCase(outcome)}ed By`} ${target.name}.`,
      })
      this.events.push({
        type: 'meleeHit',
        source: p.id,
        target: target.id,
        damage: 0,
        outcome,
        yellow: false,
      })
      return
    }

    let dmg = weaponSwingDamage(
      p.weaponMin,
      p.weaponMax,
      p.weaponSpeed,
      p.ap,
      this.rng.nextFloat(),
    )
    if (outcome === 'glancing') {
      dmg = applyGlanceMultiplier(dmg, target.level - p.level)
    }
    if (outcome === 'crit') dmg *= 2
    const dr = armorDR(target.armor, p.level)
    dmg = Math.max(1, Math.floor(dmg * (1 - dr)))

    target.health -= dmg
    p.inCombat = true
    this.outOfCombatTimer = 0
    const rage = rageFromDealing(dmg, p.level)
    p.rage = Math.min(100, p.rage + rage)
    this.events.push({ type: 'rageChanged', entity: p.id, rage: p.rage, delta: rage })
    this.events.push({
      type: 'meleeHit',
      source: p.id,
      target: target.id,
      damage: dmg,
      outcome,
      yellow: false,
    })
    const verb = outcome === 'crit' ? 'Crits' : 'Hits'
    this.events.push({
      type: 'chat',
      channel: 'combat',
      text: `Your Auto Attack ${verb} ${target.name} For ${dmg}${outcome === 'crit' ? '!' : '.'}`,
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
    // starter 2H feel after first ding quest would replace — bump weapon a bit by level
    this.player.weaponMin = 2 + Math.floor(level * 0.8)
    this.player.weaponMax = 4 + Math.floor(level * 1.2)
    this.player.weaponSpeed = level >= 4 ? 3.3 : 1.9
    this.events.push({ type: 'levelUp', level })
    this.events.push({
      type: 'chat',
      channel: 'system',
      text: `Congratulations, You Have Reached Level ${level}!`,
    })
  }
}

function sampleHeight(x: number, z: number): number {
  return Math.sin(x * 0.05) * 0.4 + Math.cos(z * 0.05) * 0.4
}

function distSq(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x
  const dz = a.z - b.z
  return dx * dx + dz * dz
}

function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
