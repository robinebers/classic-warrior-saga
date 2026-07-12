import { describe, expect, it } from 'vitest'
import { SplitMix64 } from '../rng/SplitMix64'
import {
  expectedPlayerWhiteDelta0,
  expectedPlayerWhiteDelta3,
  rollPlayerAttack,
} from './AttackTable'

describe('attack table statistical', () => {
  it('Δ0 white within ±0.4%', () => {
    const rng = new SplitMix64(42)
    const n = 200_000
    const counts = { miss: 0, dodge: 0, glancing: 0 }
    for (let i = 0; i < n; i++) {
      const o = rollPlayerAttack(rng, {
        skillDiff: 0,
        sheetCritPct: 5,
        white: true,
        mobLevel: 60,
        playerLevel: 60,
        weaponSkill: 300,
        mobCanParry: false,
        mobCanBlock: false,
        fromBehind: false,
      })
      if (o === 'miss') counts.miss++
      if (o === 'dodge') counts.dodge++
      if (o === 'glancing') counts.glancing++
    }
    const exp = expectedPlayerWhiteDelta0()
    expect(counts.miss / n * 100).toBeCloseTo(exp.miss, 0) // within ~0.5
    expect(Math.abs(counts.miss / n * 100 - exp.miss)).toBeLessThan(0.4)
    expect(Math.abs(counts.dodge / n * 100 - exp.dodge)).toBeLessThan(0.4)
    expect(Math.abs(counts.glancing / n * 100 - exp.glance)).toBeLessThan(0.4)
  })

  it('Δ+3 white within ±0.4%', () => {
    const rng = new SplitMix64(99)
    const n = 200_000
    const playerLevel = 60
    const mobLevel = 63
    const skill = playerLevel * 5 // 300
    const defense = mobLevel * 5 // 315
    const skillDiff = defense - skill // 15
    const counts = { miss: 0, dodge: 0, glancing: 0 }
    for (let i = 0; i < n; i++) {
      const o = rollPlayerAttack(rng, {
        skillDiff,
        sheetCritPct: 5,
        white: true,
        mobLevel,
        playerLevel,
        weaponSkill: skill,
        mobCanParry: false,
        mobCanBlock: false,
        fromBehind: false,
      })
      if (o === 'miss') counts.miss++
      if (o === 'dodge') counts.dodge++
      if (o === 'glancing') counts.glancing++
    }
    const exp = expectedPlayerWhiteDelta3()
    expect(Math.abs(counts.miss / n * 100 - exp.miss)).toBeLessThan(0.4)
    expect(Math.abs(counts.dodge / n * 100 - exp.dodge)).toBeLessThan(0.4)
    expect(Math.abs(counts.glancing / n * 100 - exp.glance)).toBeLessThan(0.4)
  })
})
