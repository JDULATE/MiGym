// Supplements (local-first) — what you take, when, and whether today's doses are logged.
// Pure module: no JSX, no store import. `update` comes from the caller so every mutation
// goes through the normal store persist/sync path like any other S slice.
//
// Model on S:
//   S.supps = { items: [{
//     id, name, kind,            // creatine | protein | amino | preworkout | other
//     dose,                      // free text, e.g. "5 g"
//     sched,                     // daily | training | rest | days
//     days: [],                  // getDay() numbers, only when sched === 'days'
//     time: '09:00',             // optional daily reminder time (hh:mm, local)
//     log: { [isoDate]: true },
//   }] }
import { effectiveRoutine } from './history.js'
import { todayISO } from './format.js'

export const SUPP_KINDS = [
  { v: 'creatine', label: 'Creatine', icon: 'bolt' },
  { v: 'protein', label: 'Protein', icon: 'arm' },
  { v: 'amino', label: 'Amino acids', icon: 'shield' },
  { v: 'preworkout', label: 'Pre-workout', icon: 'rocket' },
  { v: 'other', label: 'Other', icon: 'heart' },
]

// Quick-add presets: name is an i18n key resolved at render/add time.
export const SUPP_PRESETS = [
  { kind: 'creatine', dose: '5 g', sched: 'daily', time: '09:00' },
  { kind: 'protein', dose: '1 scoop', sched: 'training', time: '' },
  { kind: 'preworkout', dose: '1 dose', sched: 'training', time: '' },
  { kind: 'amino', dose: '1 scoop', sched: 'training', time: '' },
]

const iso = () => todayISO()
export const items = S => (S.supps && Array.isArray(S.supps.items)) ? S.supps.items : []

export function isDueToday(item, S) {
  if (!item) return false
  if (item.sched === 'training') return !!effectiveRoutine(S, iso()) || !!S.active
  if (item.sched === 'rest') return !effectiveRoutine(S, iso())
  if (item.sched === 'days') return (item.days || []).includes(new Date().getDay())
  return true                                    // 'daily' and anything unrecognised
}

export const logKeyFor = item => `${item.id}:${iso()}`
const notified = new Set()                        // session-scoped: one nudge per item/day

export const takenToday = item => !!(item && item.log && item.log[iso()])
export const pendingItems = S => items(S).filter(it => isDueToday(it, S) && !takenToday(it))
export const preworkoutPending = S => pendingItems(S).find(i => i.kind === 'preworkout') || null
export const proteinPending = S => pendingItems(S).find(i => i.kind === 'protein') || null

export function markTaken(update, id, val = true) {
  update(s => {
    if (!s.supps) s.supps = { items: [] }
    const it = s.supps.items.find(x => x.id === id)
    if (!it) return
    if (!it.log) it.log = {}
    if (val) it.log[iso()] = true; else delete it.log[iso()]
  }, true)
}

export function addItem(update, preset) {
  update(s => {
    if (!s.supps) s.supps = { items: [] }
    s.supps.items.push({
      id: 'u' + Date.now().toString(36),
      name: preset.name || '',
      kind: preset.kind || 'other',
      dose: preset.dose || '',
      sched: preset.sched || 'daily',
      days: preset.days || [],
      time: preset.time || '',
      log: {},
    })
  }, true)
}
export function patchItem(update, id, patch) {
  update(s => {
    const it = s.supps?.items?.find(x => x.id === id)
    if (it) Object.assign(it, patch)
  }, true)
}
export function removeItem(update, id) {
  update(s => { if (s.supps) s.supps.items = s.supps.items.filter(x => x.id !== id) }, true)
}

/* Due items whose reminder time has arrived and haven't been logged/nudged today.
   Returns the ones that cross the threshold this call; the caller shows the toast /
   notification. The session Set keeps each item to a single nudge per day. */
export function collectTimeReminders(S, now = new Date()) {
  const hhmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
  const out = []
  for (const it of pendingItems(S)) {
    if (!it.time || it.time > hhmm) continue
    const key = logKeyFor(it)
    if (notified.has(key)) continue
    notified.add(key)
    out.push(it)
  }
  return out
}
