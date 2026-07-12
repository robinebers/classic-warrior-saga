export type StanceMask = 'B' | 'D' | 'Z' | 'BD' | 'BZ' | 'DZ' | 'BDZ' | '—'

export type AbilityRank = {
  rank: number
  learnLevel: number
  /** flat damage or bonus depending on effect */
  effect: number
  effect2?: number
  durationSec?: number
  rageGen?: number
}

export type AbilityDef = {
  id: string
  name: string
  icon: string
  stances: StanceMask
  rageCost: number
  gcd: boolean
  cooldownSec: number
  onNextSwing?: boolean
  requiresShield?: boolean
  outOfCombatOnly?: boolean
  ranks: AbilityRank[]
  tooltip: string
}

/** Appendix C — core warrior abilities (ranks transcribed). */
export const ABILITIES: AbilityDef[] = [
  {
    id: 'heroic_strike',
    name: 'Heroic Strike',
    icon: 'sword-brandish',
    stances: 'BD',
    rageCost: 15,
    gcd: false,
    cooldownSec: 0,
    onNextSwing: true,
    ranks: [
      { rank: 1, learnLevel: 1, effect: 11 },
      { rank: 2, learnLevel: 8, effect: 21 },
      { rank: 3, learnLevel: 16, effect: 32 },
      { rank: 4, learnLevel: 24, effect: 44 },
      { rank: 5, learnLevel: 32, effect: 58 },
      { rank: 6, learnLevel: 40, effect: 80 },
      { rank: 7, learnLevel: 48, effect: 111 },
      { rank: 8, learnLevel: 56, effect: 138 },
    ],
    tooltip: 'A strong attack that increases melee damage and causes a high amount of threat.',
  },
  {
    id: 'battle_shout',
    name: 'Battle Shout',
    icon: 'shouting',
    stances: 'BDZ',
    rageCost: 10,
    gcd: true,
    cooldownSec: 0,
    ranks: [
      { rank: 1, learnLevel: 1, effect: 15, durationSec: 120 },
      { rank: 2, learnLevel: 12, effect: 35, durationSec: 120 },
      { rank: 3, learnLevel: 22, effect: 55, durationSec: 120 },
      { rank: 4, learnLevel: 32, effect: 85, durationSec: 120 },
      { rank: 5, learnLevel: 42, effect: 130, durationSec: 120 },
      { rank: 6, learnLevel: 52, effect: 185, durationSec: 120 },
    ],
    tooltip: 'The warrior shouts, increasing attack power of party members.',
  },
  {
    id: 'charge',
    name: 'Charge',
    icon: 'charging-bull',
    stances: 'B',
    rageCost: 0,
    gcd: true,
    cooldownSec: 15,
    outOfCombatOnly: true,
    ranks: [
      { rank: 1, learnLevel: 4, effect: 1, rageGen: 9 },
      { rank: 2, learnLevel: 26, effect: 1, rageGen: 12 },
      { rank: 3, learnLevel: 46, effect: 1, rageGen: 15 },
    ],
    tooltip: 'Charge an enemy, generate rage and stun briefly. Requires Battle Stance, out of combat.',
  },
  {
    id: 'rend',
    name: 'Rend',
    icon: 'bleeding-wound',
    stances: 'BD',
    rageCost: 10,
    gcd: true,
    cooldownSec: 0,
    ranks: [
      { rank: 1, learnLevel: 4, effect: 15, durationSec: 9 },
      { rank: 2, learnLevel: 10, effect: 30, durationSec: 12 },
      { rank: 3, learnLevel: 20, effect: 50, durationSec: 15 },
      { rank: 4, learnLevel: 30, effect: 85, durationSec: 18 },
      { rank: 5, learnLevel: 40, effect: 126, durationSec: 21 },
      { rank: 6, learnLevel: 50, effect: 175, durationSec: 21 },
      { rank: 7, learnLevel: 60, effect: 210, durationSec: 21 },
    ],
    tooltip: 'Wounds the target causing them to bleed for damage over time.',
  },
  {
    id: 'thunder_clap',
    name: 'Thunder Clap',
    icon: 'lightning-ring',
    stances: 'B',
    rageCost: 20,
    gcd: true,
    cooldownSec: 4,
    ranks: [
      { rank: 1, learnLevel: 6, effect: 6, durationSec: 30 },
      { rank: 2, learnLevel: 18, effect: 12, durationSec: 30 },
      { rank: 3, learnLevel: 28, effect: 19, durationSec: 30 },
      { rank: 4, learnLevel: 38, effect: 28, durationSec: 30 },
      { rank: 5, learnLevel: 48, effect: 40, durationSec: 30 },
      { rank: 6, learnLevel: 58, effect: 50, durationSec: 30 },
    ],
    tooltip: 'Blasts nearby enemies for damage and slows their attack speed.',
  },
  {
    id: 'bloodrage',
    name: 'Bloodrage',
    icon: 'blood',
    stances: 'BDZ',
    rageCost: 0,
    gcd: false,
    cooldownSec: 60,
    ranks: [{ rank: 1, learnLevel: 10, effect: 10, durationSec: 10 }],
    tooltip: 'Generates rage over time at the cost of health, and puts you in combat.',
  },
  {
    id: 'execute',
    name: 'Execute',
    icon: 'decapitation',
    stances: 'BZ',
    rageCost: 15,
    gcd: true,
    cooldownSec: 0,
    ranks: [
      { rank: 1, learnLevel: 24, effect: 125, effect2: 3 },
      { rank: 2, learnLevel: 32, effect: 200, effect2: 6 },
      { rank: 3, learnLevel: 40, effect: 325, effect2: 9 },
      { rank: 4, learnLevel: 48, effect: 450, effect2: 12 },
      { rank: 5, learnLevel: 56, effect: 600, effect2: 15 },
    ],
    tooltip: 'Attempt to finish off a foe with less than 20% health. Consumes all rage.',
  },
  {
    id: 'overpower',
    name: 'Overpower',
    icon: 'overpower',
    stances: 'B',
    rageCost: 5,
    gcd: true,
    cooldownSec: 5,
    ranks: [
      { rank: 1, learnLevel: 12, effect: 5 },
      { rank: 2, learnLevel: 28, effect: 15 },
      { rank: 3, learnLevel: 44, effect: 25 },
      { rank: 4, learnLevel: 60, effect: 35 },
    ],
    tooltip: 'Instantly overpower the enemy, usable after they dodge. Cannot be blocked, dodged, or parried.',
  },
  {
    id: 'hamstring',
    name: 'Hamstring',
    icon: 'hamstring',
    stances: 'BZ',
    rageCost: 10,
    gcd: true,
    cooldownSec: 0,
    ranks: [
      { rank: 1, learnLevel: 8, effect: 5, durationSec: 15 },
      { rank: 2, learnLevel: 32, effect: 18, durationSec: 15 },
      { rank: 3, learnLevel: 54, effect: 45, durationSec: 15 },
    ],
    tooltip: 'Maims the enemy, slowing movement speed by 40%.',
  },
]

export function abilityById(id: string): AbilityDef | undefined {
  return ABILITIES.find((a) => a.id === id)
}

export function highestLearnableRank(def: AbilityDef, level: number, knownRank: number): AbilityRank | null {
  let best: AbilityRank | null = null
  for (const r of def.ranks) {
    if (r.learnLevel <= level && r.rank > knownRank) best = r
  }
  return best
}

export function stanceAllows(mask: StanceMask, stance: 'battle' | 'defensive' | 'berserker'): boolean {
  if (mask === '—') return true
  const key = stance === 'battle' ? 'B' : stance === 'defensive' ? 'D' : 'Z'
  return mask.includes(key)
}
