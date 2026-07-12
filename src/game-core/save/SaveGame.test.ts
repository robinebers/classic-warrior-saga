import { describe, expect, it } from 'vitest'
import { World } from '../World'
import { roundTripEqual, serializeSave } from './SaveGame'
import { SplitMix64 } from '../rng/SplitMix64'

describe('save roundtrip', () => {
  it('property: 20 randomized states', () => {
    const rng = new SplitMix64(77)
    for (let i = 0; i < 20; i++) {
      const w = new World({ seed: rng.nextInt(1, 99999) })
      w.applyLevel(rng.nextInt(1, 40))
      w.addXp(rng.nextInt(0, 500))
      w.player.rage = rng.nextInt(0, 100)
      w.player.copper = rng.nextInt(0, 50000)
      w.player.position.x = rng.nextFloat() * 100
      w.player.position.z = rng.nextFloat() * 100
      const save = serializeSave(w.player, w.player.playtimeSec, w.rng.getSeedState(), [])
      const again = JSON.parse(JSON.stringify(save))
      expect(roundTripEqual(save, again)).toBe(true)
    }
  })
})
