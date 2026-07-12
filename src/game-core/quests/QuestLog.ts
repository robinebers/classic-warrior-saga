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

  onKill(archetype: string): string[] {
    const lines: string[] = []
    for (const e of this.entries) {
      if (e.status !== 'active') continue
      const def = this.def(e.questId)
      if (!def) continue
      for (const obj of def.objectives) {
        if (obj.kind !== 'kill') continue
        if (!objectiveMatches(obj.id, archetype)) continue
        const prev = e.counts[obj.id] ?? 0
        if (prev >= obj.count) continue
        e.counts[obj.id] = prev + 1
        lines.push(`${obj.text}: ${e.counts[obj.id]}/${obj.count}`)
      }
      if (this.isComplete(e, def) && e.status === 'active') {
        e.status = 'completed'
        lines.push(`Quest Objectives Complete: ${def.title}`)
      }
    }
    return lines
  }

  turnIn(questId: string): { ok: true; def: QuestDef } | { ok: false; error: string } {
    const e = this.entries.find((x) => x.questId === questId)
    const def = this.def(questId)
    if (!e || !def) return { ok: false, error: 'Unknown Quest' }
    if (e.status === 'turned_in') return { ok: false, error: 'Already Turned In' }
    if (e.status !== 'completed' && !this.isComplete(e, def)) {
      return { ok: false, error: 'Objectives Incomplete' }
    }
    e.status = 'turned_in'
    return { ok: true, def }
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
