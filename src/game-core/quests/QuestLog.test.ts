import { describe, expect, it } from 'vitest'
import { QUESTS } from './QuestData'
import { QuestLog } from './QuestLog'

describe('quests', () => {
  it('has 14 quests', () => {
    expect(QUESTS).toHaveLength(14)
  })

  it('accept and progress kill objective', () => {
    const log = new QuestLog()
    expect(log.accept('boar_tusk_harvest')).toBeNull()
    for (let i = 0; i < 8; i++) log.onKill('bristleboar')
    const e = log.entries[0]
    expect(e.status).toBe('completed')
    expect(e.counts.kill_bristleboar).toBe(8)
  })
})
