/**
 * Classic 1.12 formula crib — Appendix E.
 * Pure functions only; unit-tested spot values.
 */

/** XP required to advance from level L → L+1 (Appendix A). Level 60 = undefined/0. */
export const XP_TO_LEVEL: Readonly<Record<number, number>> = {
  1: 400, 2: 900, 3: 1400, 4: 2100, 5: 2800, 6: 3600, 7: 4500, 8: 5400, 9: 6500, 10: 7600,
  11: 8800, 12: 10100, 13: 11400, 14: 12900, 15: 14400, 16: 16000, 17: 17700, 18: 19400, 19: 21300, 20: 23200,
  21: 25200, 22: 27300, 23: 29400, 24: 31700, 25: 34000, 26: 36400, 27: 38900, 28: 41400, 29: 44300, 30: 47400,
  31: 50800, 32: 54500, 33: 58600, 34: 62800, 35: 67100, 36: 71600, 37: 76100, 38: 80800, 39: 85700, 40: 90700,
  41: 95800, 42: 101000, 43: 106300, 44: 111800, 45: 117500, 46: 123200, 47: 129100, 48: 135100, 49: 141200, 50: 147500,
  51: 153900, 52: 160400, 53: 167100, 54: 173900, 55: 180800, 56: 187900, 57: 195000, 58: 202300, 59: 209800,
}

export const TOTAL_XP_1_TO_60 = 4_084_700 // sum of Appendix A rows; prompt claimed 3,379,400 — logged deviation A1

export function xpToLevel(level: number): number {
  if (level < 1 || level >= 60) return 0
  return XP_TO_LEVEL[level] ?? 0
}

export function totalXpToReach(level: number): number {
  let sum = 0
  for (let l = 1; l < level; l++) sum += xpToLevel(l)
  return sum
}

/** Appendix B — gray level. */
export function grayLevel(playerLevel: number): number {
  const L = playerLevel
  if (L <= 5) return 0
  if (L <= 39) return L - 5 - Math.floor(L / 10)
  return L - 1 - Math.floor(L / 5)
}

/** Appendix B — Zero Difference. */
export function zeroDifference(playerLevel: number): number {
  const L = playerLevel
  if (L <= 7) return 5
  if (L <= 9) return 6
  if (L <= 11) return 7
  if (L <= 15) return 8
  if (L <= 19) return 9
  if (L <= 29) return 11
  if (L <= 39) return 12
  if (L <= 44) return 13
  if (L <= 49) return 14
  if (L <= 54) return 15
  if (L <= 59) return 16
  return 17
}

export type ConColor = 'gray' | 'green' | 'yellow' | 'orange' | 'red'

export function conColor(playerLevel: number, mobLevel: number): ConColor {
  const delta = mobLevel - playerLevel
  if (mobLevel <= grayLevel(playerLevel)) return 'gray'
  if (delta >= 5) return 'red'
  if (delta >= 3) return 'orange'
  if (delta >= -2) return 'yellow'
  return 'green'
}

/**
 * Kill XP before rested split.
 * base = pl*5+45; higher ×(1+0.05*min(Δ,4)); lower scaled by ZD; gray=0; elite×2
 */
export function rawMobXp(playerLevel: number, mobLevel: number, elite = false): number {
  if (mobLevel <= grayLevel(playerLevel)) return 0
  let base = playerLevel * 5 + 45
  if (mobLevel > playerLevel) {
    const d = Math.min(mobLevel - playerLevel, 4)
    base *= 1 + 0.05 * d
  } else if (mobLevel < playerLevel) {
    const zd = zeroDifference(playerLevel)
    base *= 1 - (playerLevel - mobLevel) / zd
  }
  if (elite) base *= 2
  return Math.max(0, Math.floor(base))
}

/**
 * Classic rested split:
 * if rest >= raw → 2*raw and rest -= raw
 * if 0 < rest < raw → awarded = rest + (raw - rest/2)
 */
export function applyRestedXp(
  raw: number,
  restedRemaining: number,
): { awarded: number; restedLeft: number } {
  if (raw <= 0) return { awarded: 0, restedLeft: restedRemaining }
  if (restedRemaining <= 0) return { awarded: raw, restedLeft: 0 }
  if (restedRemaining >= raw) {
    return { awarded: raw * 2, restedLeft: restedRemaining - raw }
  }
  const awarded = restedRemaining + (raw - restedRemaining / 2)
  return { awarded: Math.floor(awarded), restedLeft: 0 }
}

export function mobXp(
  playerLevel: number,
  mobLevel: number,
  elite: boolean,
  restedRemaining: number,
): { awarded: number; restedLeft: number; raw: number } {
  const raw = rawMobXp(playerLevel, mobLevel, elite)
  const { awarded, restedLeft } = applyRestedXp(raw, restedRemaining)
  return { awarded, restedLeft, raw }
}

/** Rage conversion c(L). c(60) ≈ 230.6 */
export function rageConversion(level: number): number {
  return 0.0091107836 * level * level + 3.225598133 * level + 4.2652911
}

export function rageFromDealing(damage: number, level: number): number {
  return (7.5 * damage) / rageConversion(level)
}

export function rageFromTaking(damage: number, level: number): number {
  return (2.5 * damage) / rageConversion(level)
}

export function attackPower(str: number, level: number): number {
  return 2 * str + 3 * level - 20
}

export function weaponSwingDamage(
  minDmg: number,
  maxDmg: number,
  weaponSpeed: number,
  ap: number,
  roll01: number,
): number {
  const base = minDmg + roll01 * (maxDmg - minDmg)
  return base + (ap / 14) * weaponSpeed
}

/** Miss % vs mob. diff = defense - skill. */
export function missChanceVsMob(diff: number, dualWield = false): number {
  let miss = diff <= 10 ? 5 + 0.1 * diff : 6 + 0.4 * (diff - 10)
  if (dualWield) miss += 19
  return Math.max(0, miss)
}

export function dodgeChanceVsMob(diff: number): number {
  return Math.max(0, 5 + 0.1 * diff)
}

export function glanceChance(defLevel: number, atkLevel: number, skill: number): number {
  return Math.max(0, 10 + (defLevel * 5 - Math.min(atkLevel * 5, skill)) * 2)
}

/** Average glance damage multiplier. */
export function glancePenaltyMultiplier(diff: number): number {
  const low = Math.min(Math.max(1.3 - 0.05 * diff, 0.01), 0.91)
  const high = Math.min(Math.max(1.2 - 0.03 * diff, 0.2), 0.99)
  return (low + high) / 2
}

export function armorDR(armor: number, attackerLevel: number): number {
  const dr = armor / (armor + 400 + 85 * attackerLevel)
  return Math.min(dr, 0.75)
}

export function healthFromStamina(baseHp: number, stamina: number): number {
  const first = Math.min(20, stamina)
  const rest = Math.max(0, stamina - 20)
  return baseHp + first * 1 + rest * 10
}

export function healthRegenTick(spirit: number): number {
  return spirit * 0.5 + 6
}

export function mobHp(level: number, elite = false): number {
  const hp = 0.56 * level * level + 21.2 * level + 10
  return Math.floor(elite ? hp * 2.4 : hp)
}

export function mobAvgMelee(level: number): number {
  return 0.05 * level * level + 1.4 * level + 2
}

export function trainCostCopper(trainLevel: number): number {
  return 10 * trainLevel * trainLevel
}

/** Crit agi divisor: linear from ~2.2 at L1 to 20 at L60, clamp ≥3. */
export function critAgiDivisor(level: number): number {
  return Math.max(3, (20 * level) / 60)
}

export function sheetCritPercent(agi: number, level: number): number {
  return agi / critAgiDivisor(level)
}

export function sheetDodgePercent(agi: number, level: number): number {
  return agi / critAgiDivisor(level)
}

/** Orc warrior level-stat anchors with monotonic interpolation. */
const STAT_ANCHORS: { level: number; str: number; agi: number; sta: number; int: number; spi: number }[] = [
  { level: 1, str: 26, agi: 17, sta: 24, int: 17, spi: 23 },
  { level: 10, str: 31, agi: 19, sta: 28, int: 17, spi: 25 },
  { level: 20, str: 42, agi: 25, sta: 38, int: 18, spi: 29 },
  { level: 30, str: 55, agi: 31, sta: 50, int: 19, spi: 33 },
  { level: 40, str: 71, agi: 38, sta: 65, int: 20, spi: 37 },
  { level: 50, str: 92, agi: 48, sta: 85, int: 21, spi: 42 },
  { level: 60, str: 117, agi: 60, sta: 110, int: 22, spi: 47 },
]

const BASE_HP_ANCHORS: [number, number][] = [
  [1, 20], [10, 81], [20, 250], [30, 550], [40, 900], [50, 1180], [60, 1483],
]

function lerpAnchors(
  level: number,
  key: 'str' | 'agi' | 'sta' | 'int' | 'spi',
): number {
  const anchors = STAT_ANCHORS
  if (level <= 1) return anchors[0][key]
  if (level >= 60) return anchors[anchors.length - 1][key]
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i]
    const b = anchors[i + 1]
    if (level >= a.level && level <= b.level) {
      const t = (level - a.level) / (b.level - a.level)
      return Math.round(a[key] + (b[key] - a[key]) * t)
    }
  }
  return anchors[anchors.length - 1][key]
}

export function baseHpForLevel(level: number): number {
  if (level <= 1) return 20
  if (level >= 60) return 1483
  for (let i = 0; i < BASE_HP_ANCHORS.length - 1; i++) {
    const [la, ha] = BASE_HP_ANCHORS[i]
    const [lb, hb] = BASE_HP_ANCHORS[i + 1]
    if (level >= la && level <= lb) {
      const t = (level - la) / (lb - la)
      return Math.round(ha + (hb - ha) * t)
    }
  }
  return 1483
}

export function orcWarriorBaseStats(level: number) {
  return {
    str: lerpAnchors(level, 'str'),
    agi: lerpAnchors(level, 'agi'),
    sta: lerpAnchors(level, 'sta'),
    int: lerpAnchors(level, 'int'),
    spi: lerpAnchors(level, 'spi'),
  }
}
