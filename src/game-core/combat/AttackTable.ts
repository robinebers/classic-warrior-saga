import type { SplitMix64 } from '../rng/SplitMix64'
import {
  dodgeChanceVsMob,
  glanceChance,
  glancePenaltyMultiplier,
  missChanceVsMob,
} from '../Formulas'

export type AttackOutcome =
  | 'miss'
  | 'dodge'
  | 'parry'
  | 'block'
  | 'glancing'
  | 'crit'
  | 'crushing'
  | 'hit'

export type PlayerSwingInput = {
  /** defense - weapon skill (mobDef - playerSkill) */
  skillDiff: number
  sheetCritPct: number
  white: boolean
  mobLevel: number
  playerLevel: number
  weaponSkill: number
  mobCanParry: boolean
  mobCanBlock: boolean
  fromBehind: boolean
  dualWield?: boolean
}

export type MobSwingInput = {
  /** player defense skill - mob weapon skill approx */
  skillDiff: number
  playerDodgePct: number
  playerParryPct: number
  playerBlockPct: number
  fromBehind: boolean
  /** crushing if mob is +4 or more */
  canCrush: boolean
}

/** Player → mob single-roll table. */
export function rollPlayerAttack(rng: SplitMix64, input: PlayerSwingInput): AttackOutcome {
  const miss = missChanceVsMob(input.skillDiff, !!input.dualWield)
  const dodge = dodgeChanceVsMob(input.skillDiff)
  const parry = input.mobCanParry && !input.fromBehind ? dodgeChanceVsMob(input.skillDiff) : 0
  const block = input.mobCanBlock && !input.fromBehind ? 5 : 0
  const glancing = input.white
    ? glanceChance(input.mobLevel, input.playerLevel, input.weaponSkill)
    : 0
  const crit = Math.max(0, input.sheetCritPct - Math.max(0, input.mobLevel - input.playerLevel))

  return pick(rng, [
    ['miss', miss],
    ['dodge', dodge],
    ['parry', parry],
    ['block', block],
    ['glancing', glancing],
    ['crit', crit],
  ])
}

/** Mob → player. */
export function rollMobAttack(rng: SplitMix64, input: MobSwingInput): AttackOutcome {
  // Base miss 5% ± 0.04%/point simplified as 5 + 0.04*diff
  const miss = Math.max(0, 5 + 0.04 * input.skillDiff)
  const dodge = input.playerDodgePct
  const parry = input.fromBehind ? 0 : input.playerParryPct
  const block = input.fromBehind ? 0 : input.playerBlockPct
  const crushing = input.canCrush ? 15 : 0 // classic-feel chunk; rare in our content

  return pick(rng, [
    ['miss', miss],
    ['dodge', dodge],
    ['parry', parry],
    ['block', block],
    ['crushing', crushing],
  ])
}

function pick(rng: SplitMix64, entries: [AttackOutcome, number][]): AttackOutcome {
  let roll = rng.nextFloat() * 100
  for (const [o, p] of entries) {
    if (p <= 0) continue
    if (roll < p) return o
    roll -= p
  }
  return 'hit'
}

export function applyGlanceMultiplier(damage: number, levelDiff: number): number {
  return damage * glancePenaltyMultiplier(Math.max(0, levelDiff))
}

export function expectedPlayerWhiteDelta0() {
  return { miss: 5, dodge: 5, glance: 10 }
}

export function expectedPlayerWhiteDelta3() {
  return { miss: 8, dodge: 6.5, glance: 40 }
}
