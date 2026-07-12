import { QUESTS, type QuestDef } from './QuestData'

export type QuestProgress = {
  questId: string
  status: 'active' | 'completed' | 'turned_in'
  counts: Record<string, number>
}

export class QuestLog {
  entries: QuestProgress[] = []

  accept(questId: string): string | null {
    const def = QUESTS.find((q) => q.id === questId)
    if (!def) return 'Unknown Quest'
    if (this.entries.some((e) => e.questId === questId)) return 'Already On That Quest'
    this.entries.push({
      questId,
      status: 'active',
      counts: Object.fromEntries(def.objectives.map((o) => [o.id, 0])),
    })
    return null
  }

  onKill(archetype: string): void {
    for (const e of this.entries) {
      if (e.status !== 'active') continue
      const def = this.def(e.questId)
      if (!def) continue
      for (const obj of def.objectives) {
        if (obj.kind !== 'kill') continue
        if (objectiveMatches(obj.id, archetype)) {
          e.counts[obj.id] = Math.min(obj.count, (e.counts[obj.id] ?? 0) + 1)
        }
      }
      if (this.isComplete(e, def)) e.status = 'completed'
    }
  }

  isComplete(e: QuestProgress, def: QuestDef): boolean {
    return def.objectives.every((o) => (e.counts[o.id] ?? 0) >= o.count)
  }

  def(id: string): QuestDef | undefined {
    return QUESTS.find((q) => q.id === id)
  }

  active(): QuestProgress[] {
    return this.entries.filter((e) => e.status === 'active' || e.status === 'completed')
  }
}

function objectiveMatches(objectiveId: string, archetype: string): boolean {
  if (objectiveId.includes('bristle') && archetype.includes('bristle')) return true
  if (objectiveId.includes('scorpid') && archetype.includes('scorpid')) return true
  if (objectiveId.includes('wolf') && archetype.includes('wolf')) return true
  if (objectiveId.includes('raider') && archetype.includes('raider')) return true
  if (objectiveId.includes('emberfang') && archetype.includes('emberfang')) return true
  if (objectiveId.includes('shrike') && archetype.includes('shrike')) return true
  if (objectiveId.includes('gormash') && archetype.includes('gor')) return true
  return false
}
