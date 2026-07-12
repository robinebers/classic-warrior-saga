import type { PlayerState } from '../World'
import type { Stance } from '../types'

export type SaveGame = {
  version: 1
  savedAt: string
  player: PlayerState
  mobSeeds: { archetype: string; name: string; level: number; x: number; z: number; elite: boolean }[]
  settings: { musicDb: number; sfxDb: number }
  playtimeSec: number
  rngState: string
}

export function serializeSave(
  player: PlayerState,
  playtimeSec: number,
  rngState: string,
  mobs: SaveGame['mobSeeds'],
): SaveGame {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    player: structuredClone(player),
    mobSeeds: mobs,
    settings: { musicDb: -12, sfxDb: 0 },
    playtimeSec,
    rngState,
  }
}

export function saveToLocalStorage(save: SaveGame, slot = 'quick'): void {
  localStorage.setItem(`cws.save.${slot}`, JSON.stringify(save))
}

export function loadFromLocalStorage(slot = 'quick'): SaveGame | null {
  const raw = localStorage.getItem(`cws.save.${slot}`)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as SaveGame
    if (parsed.version !== 1) return null
    return parsed
  } catch {
    return null
  }
}

export function roundTripEqual(a: SaveGame, b: SaveGame): boolean {
  return JSON.stringify(a.player) === JSON.stringify(b.player) && a.rngState === b.rngState
}

/** Ensure stance type stays valid after JSON parse. */
export function normalizeStance(s: string): Stance {
  if (s === 'defensive' || s === 'berserker') return s
  return 'battle'
}
