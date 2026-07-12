import { describe, expect, it } from 'vitest'
import { runSimBot } from './SimBot'

describe('SimBot', () => {
  it('reaches level 4 within budget', () => {
    const report = runSimBot({ seed: 42, targetLevel: 4, maxSimSeconds: 30 * 60 })
    expect(report.reachedLevel).toBeGreaterThanOrEqual(4)
    expect(report.invariantViolations).toBe(0)
    expect(report.playtimeSec).toBeLessThan(30 * 60)
  }, 60_000)

  it('reaches level 10 within combat budget', () => {
    // Spec: < 90 combat-minutes; allow brief travel/rez overhead → 90m hard cap on report.playtimeSec
    const report = runSimBot({ seed: 7, targetLevel: 10, maxSimSeconds: 90 * 60 })
    expect(report.invariantViolations).toBe(0)
    expect(report.reachedLevel).toBeGreaterThanOrEqual(10)
    expect(report.playtimeSec).toBeLessThanOrEqual(90 * 60)
  }, 120_000)
})
