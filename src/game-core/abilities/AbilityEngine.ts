import {
  ABILITIES,
  abilityById,
  stanceAllows,
  type AbilityDef,
  type AbilityRank,
} from './AbilityData'
import type { Stance } from '../types'

export type Aura = {
  id: string
  name: string
  remaining: number
  tickEvery: number
  tickAcc: number
  stacks: number
  totalDamage?: number
  apBonus?: number
  source: 'player' | 'mob'
  targetId: number
}

export type AbilityRuntime = {
  gcdRemaining: number
  stanceCdRemaining: number
  cooldowns: Record<string, number>
  nextSwingAbility: string | null
  overpowerWindow: number
  revengeWindow: number
  auras: Aura[]
  error: string | null
}

export function createAbilityRuntime(): AbilityRuntime {
  return {
    gcdRemaining: 0,
    stanceCdRemaining: 0,
    cooldowns: {},
    nextSwingAbility: null,
    overpowerWindow: 0,
    revengeWindow: 0,
    auras: [],
    error: null,
  }
}

export function tickAbilityRuntime(rt: AbilityRuntime, dt: number): void {
  rt.gcdRemaining = Math.max(0, rt.gcdRemaining - dt)
  rt.stanceCdRemaining = Math.max(0, rt.stanceCdRemaining - dt)
  rt.overpowerWindow = Math.max(0, rt.overpowerWindow - dt)
  rt.revengeWindow = Math.max(0, rt.revengeWindow - dt)
  for (const id of Object.keys(rt.cooldowns)) {
    rt.cooldowns[id] = Math.max(0, rt.cooldowns[id] - dt)
    if (rt.cooldowns[id] === 0) delete rt.cooldowns[id]
  }
  for (const a of rt.auras) {
    a.remaining -= dt
    a.tickAcc += dt
  }
  rt.auras = rt.auras.filter((a) => a.remaining > 0)
}

export type CastContext = {
  level: number
  rage: number
  stance: Stance
  inCombat: boolean
  known: Record<string, number>
  targetHpPct: number | null
  hasShield: boolean
}

export type CastResult =
  | { ok: false; error: string }
  | {
      ok: true
      def: AbilityDef
      rank: AbilityRank
      consumeRage: number
      consumeAllRage?: boolean
      queueNextSwing?: boolean
    }

export function tryCast(rt: AbilityRuntime, abilityId: string, ctx: CastContext): CastResult {
  const def = abilityById(abilityId)
  if (!def) return { ok: false, error: 'Unknown Ability' }
  const knownRank = ctx.known[abilityId] ?? 0
  if (knownRank <= 0) return { ok: false, error: 'You Have Not Learned That Ability' }
  if (!stanceAllows(def.stances, ctx.stance)) {
    const need =
      def.stances.includes('B') && !def.stances.includes('D') && !def.stances.includes('Z')
        ? 'Battle Stance'
        : def.stances === 'D'
          ? 'Defensive Stance'
          : def.stances === 'Z'
            ? 'Berserker Stance'
            : 'The Correct Stance'
    return { ok: false, error: `You Must Be In ${need}` }
  }
  if (def.requiresShield && !ctx.hasShield) return { ok: false, error: 'Requires Shield' }
  if (def.outOfCombatOnly && ctx.inCombat) return { ok: false, error: 'Cannot Be Used In Combat' }
  if (def.gcd && rt.gcdRemaining > 0) return { ok: false, error: 'Ability Not Ready Yet' }
  if ((rt.cooldowns[abilityId] ?? 0) > 0) return { ok: false, error: 'Ability Not Ready Yet' }
  if (abilityId === 'overpower' && rt.overpowerWindow <= 0) {
    return { ok: false, error: 'Ability Not Ready Yet' }
  }
  if (abilityId === 'execute' && (ctx.targetHpPct == null || ctx.targetHpPct >= 0.2)) {
    return { ok: false, error: 'Invalid Target' }
  }

  let cost = def.rageCost
  // Improved HS talent placeholder handled later
  if (ctx.rage < cost && !def.onNextSwing) {
    return { ok: false, error: 'Not Enough Rage' }
  }
  if (def.onNextSwing && ctx.rage < cost) {
    return { ok: false, error: 'Not Enough Rage' }
  }

  const rank = def.ranks.find((r) => r.rank === knownRank) ?? def.ranks[0]

  if (def.onNextSwing) {
    rt.nextSwingAbility = abilityId
    return { ok: true, def, rank, consumeRage: 0, queueNextSwing: true }
  }

  if (def.gcd) rt.gcdRemaining = 1.5
  if (def.cooldownSec > 0) rt.cooldowns[abilityId] = def.cooldownSec

  if (abilityId === 'execute') {
    return { ok: true, def, rank, consumeRage: cost, consumeAllRage: true }
  }
  return { ok: true, def, rank, consumeRage: cost }
}

export function defaultActionBar(): string[] {
  return [
    'attack',
    'heroic_strike',
    'battle_shout',
    'charge',
    'rend',
    'thunder_clap',
    'hamstring',
    'bloodrage',
    'overpower',
    'execute',
    'sunder_armor',
    'cleave',
  ]
}

export { ABILITIES }
