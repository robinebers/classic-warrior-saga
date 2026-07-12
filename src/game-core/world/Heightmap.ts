/**
 * Hand-authored continuous heightfield for the CWS map (~1.6km feel scaled to playable ~400–800 yd).
 * Same functions drive GameCore collision and the R3F mesh — no drift.
 */

export const MAP_HALF = 280 // world extents ±MAP_HALF on X/Z
export const MAX_WALKABLE_SLOPE = 0.85 // rise/run ≈ tan; steeper = blocked

export type ZoneId = 'valley' | 'flats' | 'canyons' | 'ashen'

export type RockBlocker = {
  x: number
  z: number
  radius: number
  height: number
}

/** Campfire / inn rest radius in the Valley. */
export const REST_CAMP = { x: 0, z: 8, radius: 12 }

/** Named rock / ridge blockers (cylinders). */
export const ROCKS: RockBlocker[] = [
  { x: 18, z: -22, radius: 3.2, height: 6 },
  { x: -24, z: -10, radius: 4.0, height: 7 },
  { x: 32, z: 40, radius: 3.5, height: 5 },
  { x: -40, z: 55, radius: 5.0, height: 8 },
  { x: 55, z: -50, radius: 4.2, height: 6 },
  { x: -60, z: -70, radius: 6.0, height: 9 },
  { x: 90, z: 20, radius: 4.5, height: 7 },
  { x: -85, z: 90, radius: 5.5, height: 8 },
  { x: 120, z: -100, radius: 7.0, height: 10 },
  { x: -130, z: 140, radius: 6.5, height: 11 },
  { x: 160, z: 160, radius: 8.0, height: 12 },
  { x: -170, z: -150, radius: 7.5, height: 11 },
  { x: 200, z: -40, radius: 5.0, height: 8 },
  { x: -210, z: 60, radius: 6.0, height: 9 },
  // Canyon gate props
  { x: -8, z: -55, radius: 2.5, height: 9 },
  { x: 8, z: -55, radius: 2.5, height: 9 },
]

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v))
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

/** Zone by world Z bands (north → ashen). */
export function zoneAt(x: number, z: number): ZoneId {
  void x
  if (z > 120) return 'ashen'
  if (z > 20) return 'canyons'
  if (z > -50) return 'flats'
  return 'valley'
}

export function zoneName(id: ZoneId): string {
  switch (id) {
    case 'valley':
      return 'Valley Of Trials'
    case 'flats':
      return 'Sunscorch Flats'
    case 'canyons':
      return 'Redrock Canyons'
    case 'ashen':
      return 'The Ashen Barrens'
  }
}

/**
 * Height at (x,z). Valley bowl near origin, flats plateau, canyon mesas, ashen badlands.
 */
export function sampleHeight(x: number, z: number): number {
  const zone = zoneAt(x, z)

  // Base undulation
  let y =
    Math.sin(x * 0.035) * 0.55 +
    Math.cos(z * 0.028) * 0.45 +
    Math.sin((x + z) * 0.02) * 0.35

  // Valley bowl (starter enclosure)
  const valleyDist = Math.hypot(x, z + 5)
  const bowl = smoothstep(55, 25, valleyDist) // 1 inside
  y += (1 - bowl) * 4.5 // rim walls
  y += bowl * (Math.sin(x * 0.08) * 0.25)

  // Flats: gentler
  if (zone === 'flats' || zone === 'canyons' || zone === 'ashen') {
    const t = smoothstep(-50, -20, z)
    y = y * (1 - t * 0.4) + t * (1.2 + Math.sin(x * 0.02) * 0.8)
  }

  // Canyon mesas / ridges
  if (zone === 'canyons' || zone === 'ashen') {
    const mesa = Math.max(0, Math.sin(x * 0.04) * Math.cos(z * 0.035))
    y += mesa * mesa * 8
    // gullies
    y -= Math.max(0, Math.sin(x * 0.09)) * 1.5 * smoothstep(20, 80, z)
  }

  // Ashen: scorched rises
  if (zone === 'ashen') {
    y += Math.abs(Math.sin(x * 0.015) * Math.cos(z * 0.012)) * 6
    y += 2
  }

  // Rock pillars add local height bump (visual only — collision via ROCKS)
  for (const r of ROCKS) {
    const d = Math.hypot(x - r.x, z - r.z)
    if (d < r.radius * 1.4) {
      const t = 1 - d / (r.radius * 1.4)
      y += t * t * r.height * 0.35
    }
  }

  return y
}

/** Approximate slope magnitude (rise over 1 yd). */
export function sampleSlope(x: number, z: number): number {
  const e = 0.35
  const hx = sampleHeight(x + e, z) - sampleHeight(x - e, z)
  const hz = sampleHeight(x, z + e) - sampleHeight(x, z - e)
  return Math.hypot(hx / (2 * e), hz / (2 * e))
}

export function isWalkable(x: number, z: number): boolean {
  if (Math.abs(x) > MAP_HALF - 2 || Math.abs(z) > MAP_HALF - 2) return false
  if (sampleSlope(x, z) > MAX_WALKABLE_SLOPE) return false
  for (const r of ROCKS) {
    if (Math.hypot(x - r.x, z - r.z) < r.radius) return false
  }
  return true
}

/** Push a point out of rock cylinders. */
export function resolveRockCollision(
  x: number,
  z: number,
  radius = 0.55,
): { x: number; z: number } {
  let ox = x
  let oz = z
  for (const r of ROCKS) {
    const dx = ox - r.x
    const dz = oz - r.z
    const d = Math.hypot(dx, dz)
    const min = r.radius + radius
    if (d > 0 && d < min) {
      const push = (min - d) / d
      ox += dx * push
      oz += dz * push
    }
  }
  return { x: ox, z: oz }
}

export function isRestingAt(x: number, z: number): boolean {
  return Math.hypot(x - REST_CAMP.x, z - REST_CAMP.z) <= REST_CAMP.radius
}

/** Ground tint per zone for mesh vertex colors. */
export function zoneColor(id: ZoneId): [number, number, number] {
  switch (id) {
    case 'valley':
      return [0.55, 0.35, 0.22]
    case 'flats':
      return [0.62, 0.42, 0.25]
    case 'canyons':
      return [0.58, 0.28, 0.18]
    case 'ashen':
      return [0.28, 0.26, 0.24]
  }
}
