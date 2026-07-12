import { describe, expect, it } from 'vitest'
import { runSimBot } from './SimBot'

describe('SimBot', () => {
  it('reaches level 4 within budget', () => {
    const report = runSimBot({ seed: 42, targetLevel: 4, maxSimSeconds: 30 * 60 })
    expect(report.reachedLevel).toBeGreaterThanOrEqual(4)
    expect(report.invariantViolations).toBe(0)
    expect(report.playtimeSec).toBeLessThan(30 * 60)
  }, 60_000)
})
