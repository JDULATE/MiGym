import { describe, expect, it, vi } from 'vitest'
import {
  items, isDueToday, takenToday, pendingItems, preworkoutPending, proteinPending,
  markTaken, addItem, removeItem, collectTimeReminders,
} from './supplements.js'

// deterministic "today": the helpers call todayISO() which reads the real clock —
// freeze Date for the suite so log keys and day-of-week checks are stable.
const FIXED = new Date('2026-08-25T10:00:00')   // a Tuesday
vi.useFakeTimers({ now: FIXED })

const baseS = over => ({ routines: [{ id: 'r1', ex: [{ id: '0001' }] }], active: null, dayPlan: {}, week: { 2: 'r1' }, ...over })

describe('supplements', () => {
  it('starts empty and stays harmless without S.supps', () => {
    const S = baseS()
    expect(items(S)).toEqual([])
    expect(pendingItems(S)).toEqual([])
  })

  it('daily is due every day; days-sched only on listed weekdays', () => {
    const creatine = { sched: 'daily' }
    const zinc = { sched: 'days', days: [2] }        // Tuesday = 2
    const iron = { sched: 'days', days: [1] }        // Monday
    expect(isDueToday(creatine, baseS())).toBe(true)
    expect(isDueToday(zinc, baseS())).toBe(true)
    expect(isDueToday(iron, baseS())).toBe(false)
  })

  it('training/rest schedules follow the effective routine', () => {
    const pre = { sched: 'training' }
    const rest = { sched: 'rest' }
    expect(isDueToday(pre, baseS())).toBe(true)      // r1 has exercises → training day
    expect(isDueToday(rest, baseS())).toBe(false)
    expect(isDueToday(pre, baseS({ routines: [] }))).toBe(false)
    expect(isDueToday(rest, baseS({ routines: [] }))).toBe(true)
  })

  it('markTaken logs per-day and pending shrinks', () => {
    const updates = []
    const update = vi.fn(fn => { const s = {}; s.supps = { items: [{ id: 'a', sched: 'daily', log: {} }] }; fn(s); updates.push(s) })
    markTaken(update, 'a')
    expect(updates[0].supps.items[0].log['2026-08-25']).toBe(true)
  })

  it('pendingItems / preworkoutPending / proteinPending pick the right kinds', () => {
    const S = baseS()
    S.supps = { items: [
      { id: 'c', kind: 'creatine', sched: 'daily', log: {} },
      { id: 'p', kind: 'preworkout', sched: 'training', log: {} },
      { id: 'w', kind: 'protein', sched: 'training', log: {} },
    ] }
    expect(pendingItems(S).map(i => i.id)).toEqual(['c', 'p', 'w'])
    expect(preworkoutPending(S).id).toBe('p')
    expect(proteinPending(S).id).toBe('w')
    // logged protein drops out of the pending list
    S.supps.items[2].log['2026-08-25'] = true
    expect(proteinPending(S)).toBeNull()
  })

  it('collectTimeReminders nudges once per item/day after its time', () => {
    const S = baseS()
    S.supps = { items: [
      { id: 'a', sched: 'daily', time: '09:00', log: {} },
      { id: 'b', sched: 'daily', time: '23:00', log: {} },   // not yet
    ] }
    const first = collectTimeReminders(S, new Date('2026-08-25T10:00:00'))
    expect(first.map(i => i.id)).toEqual(['a'])
    const again = collectTimeReminders(S, new Date('2026-08-25T10:05:00'))
    expect(again).toEqual([])                                 // session-scoped nudge
    const late = collectTimeReminders(S, new Date('2026-08-25T23:30:00'))
    expect(late.map(i => i.id)).toEqual(['b'])                // different item, own nudge
  })

  it('addItem/removeItem shape the slice for the store', () => {
    const updates = []
    const update = vi.fn(fn => { const s = {}; s.supps = { items: [] }; fn(s); updates.push(s) })
    addItem(update, { name: 'Creatine', kind: 'creatine', dose: '5 g', sched: 'daily' })
    expect(updates.at(-1).supps.items).toHaveLength(1)
    removeItem(update, updates.at(-1).supps.items[0].id)
    expect(updates.at(-1).supps.items).toHaveLength(0)
  })
})
