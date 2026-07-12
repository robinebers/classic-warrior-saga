import { describe, expect, it } from 'vitest'
import {
  XP_TO_LEVEL,
  TOTAL_XP_1_TO_60,
  xpToLevel,
  grayLevel,
  zeroDifference,
  rawMobXp,
  applyRestedXp,
  rageConversion,
  rageFromDealing,
  rageFromTaking,
  armorDR,
  healthFromStamina,
  missChanceVsMob,
  dodgeChanceVsMob,
  glanceChance,
  trainCostCopper,
  attackPower,
} from './Formulas'

describe('XP table Appendix A', () => {
  it('spot values', () => {
    expect(xpToLevel(1)).toBe(400)
    expect(xpToLevel(10)).toBe(7600)
    expect(xpToLevel(30)).toBe(47400)
    expect(xpToLevel(59)).toBe(209800)
    expect(xpToLevel(60)).toBe(0)
  })

  it('totals 3,379,400', () => {
    let sum = 0
    for (let l = 1; l <= 59; l++) sum += XP_TO_LEVEL[l]
    expect(sum).toBe(TOTAL_XP_1_TO_60)
  })
})

describe('gray / ZD Appendix B', () => {
  it('gray levels', () => {
    expect(grayLevel(1)).toBe(0)
    expect(grayLevel(6)).toBe(1)
    expect(grayLevel(60)).toBe(47)
  })

  it('ZD at 60 is 17', () => {
    expect(zeroDifference(60)).toBe(17)
    expect(zeroDifference(1)).toBe(5)
  })
})

describe('mob XP', () => {
  it('equal level', () => {
    expect(rawMobXp(10, 10)).toBe(10 * 5 + 45)
  })

  it('gray is zero', () => {
    expect(rawMobXp(60, 47)).toBe(0)
  })

  it('elite doubles', () => {
    expect(rawMobXp(10, 10, true)).toBe((10 * 5 + 45) * 2)
  })

  it('rested full double', () => {
    const { awarded, restedLeft } = applyRestedXp(100, 200)
    expect(awarded).toBe(200)
    expect(restedLeft).toBe(100)
  })

  it('rested partial split', () => {
    const { awarded, restedLeft } = applyRestedXp(100, 40)
    // 40 + (100 - 20) = 120
    expect(awarded).toBe(120)
    expect(restedLeft).toBe(0)
  })
})

describe('rage', () => {
  it('c(60) ≈ 230.6', () => {
    expect(rageConversion(60)).toBeCloseTo(230.6, 0)
  })

  it('dealing / taking', () => {
    const c = rageConversion(60)
    expect(rageFromDealing(c, 60)).toBeCloseTo(7.5, 5)
    expect(rageFromTaking(c, 60)).toBeCloseTo(2.5, 5)
  })
})

describe('combat helpers', () => {
  it('miss/dodge at diff 0', () => {
    expect(missChanceVsMob(0)).toBeCloseTo(5, 5)
    expect(dodgeChanceVsMob(0)).toBeCloseTo(5, 5)
  })

  it('glance at +3 skill gap feel', () => {
    // defL=atkL+3, skill=atkL*5 → glance 10+(15)*2=40
    expect(glanceChance(13, 10, 50)).toBe(40)
  })

  it('armor DR caps 75%', () => {
    expect(armorDR(1_000_000, 60)).toBe(0.75)
  })

  it('L1 orc HP 80', () => {
    // base 20 + first 20 sta + 4*10 = 20+20+40 = 80
    expect(healthFromStamina(20, 24)).toBe(80)
  })

  it('AP formula', () => {
    expect(attackPower(26, 1)).toBe(2 * 26 + 3 - 20)
  })

  it('train cost', () => {
    expect(trainCostCopper(1)).toBe(10)
    expect(trainCostCopper(30)).toBe(9000)
  })
})
