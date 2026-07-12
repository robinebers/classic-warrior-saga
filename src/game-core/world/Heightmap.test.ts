import { describe, expect, it } from 'vitest'
import {
  isRestingAt,
  isWalkable,
  resolveRockCollision,
  sampleHeight,
  sampleSlope,
  zoneAt,
  zoneName,
  ROCKS,
  REST_CAMP,
} from './Heightmap'

describe('Heightmap', () => {
  it('zones by z bands', () => {
    expect(zoneAt(0, -80)).toBe('valley')
    expect(zoneAt(0, 0)).toBe('flats')
    expect(zoneAt(0, 50)).toBe('canyons')
    expect(zoneAt(0, 150)).toBe('ashen')
    expect(zoneName('valley')).toBe('Valley Of Trials')
  })

  it('valley floor lower than rim', () => {
    const floor = sampleHeight(0, 0)
    const rim = sampleHeight(50, -5)
    expect(rim).toBeGreaterThan(floor)
  })

  it('rest camp detects center', () => {
    expect(isRestingAt(REST_CAMP.x, REST_CAMP.z)).toBe(true)
    expect(isRestingAt(200, 200)).toBe(false)
  })

  it('rocks block walkability', () => {
    const r = ROCKS[0]
    expect(isWalkable(r.x, r.z)).toBe(false)
    expect(isWalkable(0, 0)).toBe(true)
  })

  it('resolves rock collision outward', () => {
    const r = ROCKS[0]
    const out = resolveRockCollision(r.x + 0.1, r.z)
    expect(Math.hypot(out.x - r.x, out.z - r.z)).toBeGreaterThan(r.radius)
  })

  it('slope is finite', () => {
    expect(sampleSlope(10, 10)).toBeGreaterThanOrEqual(0)
    expect(Number.isFinite(sampleSlope(10, 10))).toBe(true)
  })
})
