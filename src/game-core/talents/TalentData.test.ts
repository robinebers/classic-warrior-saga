import { describe, expect, it } from 'vitest'
import { canSpendPoint, talentPointsAvailable, TALENTS } from './TalentData'

describe('talents', () => {
  it('no points before 10', () => {
    expect(talentPointsAvailable(9, {})).toBe(0)
    expect(talentPointsAvailable(10, {})).toBe(1)
    expect(talentPointsAvailable(60, {})).toBe(51)
  })

  it('tier gating', () => {
    expect(canSpendPoint({}, 'improved_heroic_strike', 1)).toBe(true)
    expect(canSpendPoint({}, 'tactical_mastery', 5)).toBe(false)
    const spent = {
      improved_heroic_strike: 3,
      deflection: 2,
    }
    expect(canSpendPoint(spent, 'tactical_mastery', 1)).toBe(true)
  })

  it('has mortal strike and bloodthirst and shield slam', () => {
    expect(TALENTS.some((t) => t.id === 'mortal_strike')).toBe(true)
    expect(TALENTS.some((t) => t.id === 'bloodthirst')).toBe(true)
    expect(TALENTS.some((t) => t.id === 'shield_slam')).toBe(true)
  })
})
