/**
 * Durotar / Barrens-mood heightfield.
 * Red rock ridges, dry flats, valley bowl, canyon cuts, ashen badlands.
 * Shared by GameCore collision + R3F mesh.
 */

export const MAP_HALF = 320
export const MAX_WALKABLE_SLOPE = 1.15

export type ZoneId = 'valley' | 'flats' | 'canyons' | 'ashen'

export type RockBlocker = {
  x: number
  z: number
  radius: number
  height: number
}

export const REST_CAMP = { x: 0, z: 10, radius: 14 }

export const ROCKS: RockBlocker[] = [
  // Valley rim spines
  { x: 22, z: -28, radius: 4.5, height: 9 },
  { x: -26, z: -18, radius: 5.2, height: 11 },
  { x: 35, z: 8, radius: 3.8, height: 7 },
  { x: -38, z: 22, radius: 4.8, height: 10 },
  // Flats mesas / buttes
  { x: 48, z: 55, radius: 6.5, height: 14 },
  { x: -55, z: 70, radius: 7.0, height: 16 },
  { x: 70, z: -40, radius: 5.5, height: 12 },
  { x: -72, z: -55, radius: 6.0, height: 13 },
  // Canyon gate
  { x: -10, z: -62, radius: 3.2, height: 14 },
  { x: 10, z: -62, radius: 3.2, height: 14 },
  { x: -14, z: -70, radius: 2.8, height: 11 },
  { x: 14, z: -70, radius: 2.8, height: 11 },
  // Deep canyon / ashen
  { x: 110, z: 90, radius: 8.0, height: 18 },
  { x: -120, z: 110, radius: 9.0, height: 20 },
  { x: 150, z: -90, radius: 7.5, height: 17 },
  { x: -160, z: -120, radius: 8.5, height: 19 },
  { x: 200, z: 160, radius: 10, height: 22 },
  { x: -210, z: 180, radius: 11, height: 24 },
  { x: 90, z: 200, radius: 7, height: 15 },
  { x: -95, z: -180, radius: 6.5, height: 14 },
]

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v))
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

function noise2(x: number, z: number): number {
  return (
    Math.sin(x * 0.11 + z * 0.07) * 0.55 +
    Math.sin(x * 0.27 - z * 0.19) * 0.28 +
    Math.cos(x * 0.53 + z * 0.41) * 0.12
  )
}

export function zoneAt(x: number, z: number): ZoneId {
  void x
  if (z > 140) return 'ashen'
  if (z > 35) return 'canyons'
  if (z > -55) return 'flats'
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

export function sampleHeight(x: number, z: number): number {
  const zone = zoneAt(x, z)
  let y = noise2(x, z) * 1.8

  // --- Valley of Trials: deep bowl with spiked rim ---
  const valleyDist = Math.hypot(x * 1.05, (z + 8) * 1.15)
  const inside = smoothstep(70, 32, valleyDist)
  const rim = 1 - inside
  y += inside * (noise2(x * 1.4, z * 1.4) * 0.6)
  y += rim * (9 + noise2(x * 0.5, z * 0.5) * 3) // tall red walls

  // Dry wash / gulch through valley floor
  const wash = Math.exp(-Math.pow((x + z * 0.15) / 8, 2))
  y -= wash * 1.8 * inside

  // --- Flats: broad bake with low buttes ---
  const flatsBlend = smoothstep(-55, -25, z) * (1 - smoothstep(20, 50, z))
  y += flatsBlend * (2.5 + Math.abs(noise2(x * 0.3, z * 0.3)) * 2.2)

  // --- Canyons: sharp mesa shelves + deep cuts ---
  if (zone === 'canyons' || zone === 'ashen') {
    const shelf = Math.floor((x + 400) / 28) % 2 === 0 ? 5 : 0
    const cut = Math.exp(-Math.pow(Math.sin(x * 0.045) * 12 + (z % 40) * 0.05, 2) / 18)
    y += shelf * smoothstep(30, 70, z)
    y -= cut * 6 * smoothstep(35, 90, z)
    y += Math.pow(Math.max(0, Math.sin(x * 0.035) * Math.cos(z * 0.03)), 2) * 12
  }

  // --- Ashen: scorched ridges ---
  if (zone === 'ashen') {
    y += Math.abs(noise2(x * 0.2, z * 0.2)) * 10 + 3
    y += Math.sin(x * 0.08) * Math.sin(z * 0.06) * 4
  }

  // Rock pillars local mounds
  for (const r of ROCKS) {
    const d = Math.hypot(x - r.x, z - r.z)
    if (d < r.radius * 1.8) {
      const t = 1 - d / (r.radius * 1.8)
      y += t * t * r.height * 0.55
    }
  }

  return y
}

export function sampleSlope(x: number, z: number): number {
  const e = 0.4
  const hx = sampleHeight(x + e, z) - sampleHeight(x - e, z)
  const hz = sampleHeight(x, z + e) - sampleHeight(x, z - e)
  return Math.hypot(hx / (2 * e), hz / (2 * e))
}

export function isWalkable(x: number, z: number): boolean {
  if (Math.abs(x) > MAP_HALF - 3 || Math.abs(z) > MAP_HALF - 3) return false
  if (sampleSlope(x, z) > MAX_WALKABLE_SLOPE) return false
  for (const r of ROCKS) {
    if (Math.hypot(x - r.x, z - r.z) < r.radius * 0.92) return false
  }
  return true
}

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
    const min = r.radius * 0.92 + radius
    if (d > 0.001 && d < min) {
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

/** Barrens palette — red dirt / baked orange / ash. */
export function zoneColor(id: ZoneId): [number, number, number] {
  switch (id) {
    case 'valley':
      return [0.72, 0.38, 0.18]
    case 'flats':
      return [0.78, 0.48, 0.22]
    case 'canyons':
      return [0.65, 0.28, 0.14]
    case 'ashen':
      return [0.35, 0.3, 0.26]
  }
}

/** Procedural scrub / cactus placement seeds (deterministic). */
export function scrubPositions(count = 120): { x: number; z: number; kind: 'cactus' | 'scrub' | 'bone' }[] {
  const out: { x: number; z: number; kind: 'cactus' | 'scrub' | 'bone' }[] = []
  for (let i = 0; i < count; i++) {
    const a = i * 2.399 // golden angle-ish
    const r = 12 + (i % 47) * 5.5
    const x = Math.cos(a) * r + Math.sin(i * 0.7) * 8
    const z = Math.sin(a) * r + Math.cos(i * 0.5) * 8
    if (Math.abs(x) > MAP_HALF - 10 || Math.abs(z) > MAP_HALF - 10) continue
    if (!isWalkable(x, z) && Math.hypot(x, z + 8) < 40) continue
    const kind = i % 7 === 0 ? 'bone' : i % 3 === 0 ? 'cactus' : 'scrub'
    out.push({ x, z, kind })
  }
  return out
}
