// One engine feed for all five style candidates — pure presentation downstream.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { effectiveRoutine, lastBW, streakWeeks } from '../../lib/history.js'
import { fmtNum, todayISO, isoOf, weekKey, DAYS } from '../../lib/format.js'
import { t, dateLocale } from '../../lib/i18n.js'
import { bwSheet, goalSheet, dayOverrideSheet, calendarSheet, startFlow, loadStarterPlan } from '../../sheets.jsx'

export function useHomeData() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const [weekOffset, setWeekOffset] = useState(0)

  const today = new Date()
  const routine = effectiveRoutine(S, todayISO())
  const bw = lastBW(S)
  const prevBW = S.bodyweight.length > 1 ? S.bodyweight[S.bodyweight.length - 2] : null
  const delta = bw && prevBW ? bw.w - prevBW.w : null
  const active = !!S.active
  const empty = !S.routines.length && !active

  const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7)
  const doneDays = new Set(S.workouts.map(w => w.d))
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(monday.getDate() + i)
    const iso = isoOf(d)
    days.push({
      iso, num: d.getDate(),
      label: t(DAYS[d.getDay()]),
      short: t(DAYS[d.getDay()]).slice(0, 2).toUpperCase(),
      done: doneDays.has(iso),
      planned: !!S.week[d.getDay()],
      isToday: iso === todayISO(),
    })
  }

  const wThisWeek = S.workouts.filter(w => weekKey(w.d) === weekKey(todayISO())).length
  const plannedPerWeek = Object.keys(S.week).filter(k => S.week[k]).length

  const start = () => {
    if (active) return nav('/workout')
    if (routine) return startFlow(routine.id)
    return dayOverrideSheet(todayISO())
  }
  const openDay = iso => dayOverrideSheet(iso)

  return {
    S, user, nav,
    greetingName: user ? user.name : null,
    dateLong: today.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' }),
    dateCaps: today.toLocaleDateString(dateLocale(), { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase(),
    routine, active, empty,
    bw, unit: S.unit, delta, targetW: S.targetW,
    streak: streakWeeks(S), wThisWeek, plannedPerWeek,
    totalWorkouts: S.workouts.length,
    days, weekOffset, setWeekOffset,
    start, openDay,
    logBW: () => bwSheet(), setGoal: () => goalSheet(), openCalendar: () => calendarSheet(),
    loadStarter: () => loadStarterPlan(),
  }
}
