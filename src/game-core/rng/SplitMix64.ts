/** Deterministic SplitMix64 PRNG — injected everywhere for reproducible sims. */
export class SplitMix64 {
  private state: bigint

  constructor(seed: number | bigint = 1n) {
    this.state = BigInt(seed) & 0xffffffffffffffffn
    if (this.state === 0n) this.state = 1n
  }

  nextU64(): bigint {
    this.state = (this.state + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn
    let z = this.state
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xffffffffffffffffn
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & 0xffffffffffffffffn
    return z ^ (z >> 31n)
  }

  /** Uniform float in [0, 1). */
  nextFloat(): number {
    const v = this.nextU64() >> 11n
    return Number(v) / Number(1n << 53n)
  }

  /** Inclusive integer range. */
  nextInt(min: number, max: number): number {
    if (max <= min) return min
    return min + Math.floor(this.nextFloat() * (max - min + 1))
  }

  /** Roll 0–100 exclusive percent chance table helper. */
  chance(percent: number): boolean {
    return this.nextFloat() * 100 < percent
  }

  clone(): SplitMix64 {
    const c = new SplitMix64(0n)
    c.state = this.state
    return c
  }

  getSeedState(): string {
    return this.state.toString()
  }

  setSeedState(s: string): void {
    this.state = BigInt(s)
  }
}
