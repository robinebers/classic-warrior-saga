export type EntityId = number

export type Stance = 'battle' | 'defensive' | 'berserker'

export type Vec3 = { x: number; y: number; z: number }

export type GameEvent =
  | { type: 'meleeHit'; source: EntityId; target: EntityId; damage: number; outcome: string; yellow: boolean }
  | { type: 'rageChanged'; entity: EntityId; rage: number; delta: number }
  | { type: 'xpGained'; amount: number; rested: boolean }
  | { type: 'levelUp'; level: number }
  | { type: 'abilityLearned'; abilityId: string; rank: number }
  | { type: 'chat'; channel: 'system' | 'combat' | 'error'; text: string }
  | { type: 'entityDied'; entity: EntityId }
  | { type: 'targetChanged'; target: EntityId | null }
  | { type: 'anim'; entity: EntityId; clip: 'idle' | 'run' | 'attack' | 'death' | 'walk' }

export class EventBus {
  private buf: GameEvent[] = []

  push(e: GameEvent): void {
    this.buf.push(e)
  }

  drain(): GameEvent[] {
    const out = this.buf
    this.buf = []
    return out
  }
}
