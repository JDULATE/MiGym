// Home V2 — answers "what should I do today?" within one second.
// Hierarchy: 1) Today hero (dominant, tappable) 2) week strip 3) streak + weight glance.
// Same engines as V1 (store selectors, sheets, LineChart) — new body only.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { effectiveRoutine, lastBW, streakWeeks } from '../../lib/history.js'
import { fmtNum, fmtDate, todayISO, isoOf, weekKey, DAYS } from '../../lib/format.js'
import { t, dateLocale } from '../../lib/i18n.js'
import { bwSheet, goalSheet, dayOverrideSheet, calendarSheet, startFlow, loadStarterPlan, bwDeltaColor } from '../../sheets.jsx'
import LineChart from '../../components/LineChart.jsx'
import Icon from '../../components/Icon.jsx'
import { glyphOf } from '../../lib/glyphs.js'
import GiwiLive from '../ui/GiwiLive.jsx'

export default function HomeScreen({ onGoSettings }) {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const [weekOffset, setWeekOffset] = useState(0)
  const [cheer, setCheer] = useState(0)

  const today = new Date()
  const routine = effectiveRoutine(S, todayISO())
  const todayOvr = S.dayPlan[todayISO()] !== undefined
  const bw = lastBW(S)
  const prevBW = S.bodyweight.length > 1 ? S.bodyweight[S.bodyweight.length - 2] : null
  const delta = bw && prevBW ? bw.w - prevBW.w : null

  const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7)
  const doneDays = new Set(S.workouts.map(w => w.d))
  const strip = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(monday.getDate() + i)
    const iso = isoOf(d)
    const eff = effectiveRoutine && S.dayPlan[iso] !== undefined ? true : false
    const planned = !!S.week[d.getDay()]
    const done = doneDays.has(iso)
    const dot = done ? 'v2-dot done' : eff && planned ? 'v2-dot ovr' : planned ? 'v2-dot plan' : 'v2-dot'
    strip.push(
      <button key={i} className={'v2-wday' + (iso === todayISO() ? ' today' : '')} onClick={() => dayOverrideSheet(iso)}>
        <span className="lbl">{t(DAYS[d.getDay()])}</span>
        <span className="num">{d.getDate()}</span>
        <span className={dot} />
      </button>,
    )
  }

  const wThisWeek = S.workouts.filter(w => weekKey(w.d) === weekKey(todayISO())).length
  const plannedPerWeek = Object.keys(S.week).filter(k => S.week[k]).length
  const bwPoints = S.bodyweight.slice(-30).map(b => ({ t: b.t || new Date(b.d).getTime(), y: b.w, d: b.d }))
  const empty = !S.routines.length && !S.active

  const onToday = () => {
    if (S.active) return nav('/workout')
    if (routine) { setCheer(c => c + 1); return startFlow(routine.id) }
    return dayOverrideSheet(todayISO())
  }

  return (
    <div className="narrow">
      <div className="hdr">
        <div>
          <h1 style={{ letterSpacing: '-.03em' }}>{user ? t('Hi {0}', user.name) : 'MiGym'}</h1>
          <div className="sub">{today.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
        <button className="iconbtn pressable" onClick={onGoSettings} aria-label={t('Settings')}><Icon name="gear" /></button>
      </div>

      {/* HERO — the one dominant action */}
      <div className="v2-hero pressable" data-giwi="home-today" onClick={onToday} role="button" tabIndex={0}>
        <div className="row" style={{ gap: 14, alignItems: 'center', minWidth: 0 }}>
          <span className="v2-hero-ico" data-live={!!S.active || undefined}>
            <Icon name={S.active ? 'timer' : routine ? glyphOf(routine.emoji) : 'moon'} size={24} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="muted small">{S.active ? t('{0} — in progress', S.active.name) && t('In progress') : routine ? t('Today') : t('Rest day')}</div>
            <div style={{ fontWeight: 750, fontSize: '1.15rem', letterSpacing: '-.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {S.active ? S.active.name : routine ? routine.name : t('Rest day')}{todayOvr && routine ? ' · ' + t('rescheduled') : ''}
            </div>
          </div>
          <span className={'v2-cta' + (S.active ? ' warn' : '')}>
            {S.active ? t('Resume') : routine ? <><Icon name="play" size={14} /> {t('Start')}</> : <Icon name="plus" size={16} />}
          </span>
        </div>
      </div>

      {/* week strip */}
      <div className="v2-card">
        <div className="row between" style={{ marginBottom: 8 }}>
          <button className="iconbtn pressable" onClick={() => setWeekOffset(w => w - 1)} aria-label="←"><Icon name="chevronLeft" size={17} /></button>
          <div className="small muted" style={{ fontWeight: 550 }}>{weekOffset === 0 ? t('This week') : ''}</div>
          <button className="iconbtn pressable" onClick={() => setWeekOffset(w => w + 1)} aria-label="→"><Icon name="chevronRight" size={17} /></button>
        </div>
        <div className="v2-week">{strip}</div>
      </div>

      {empty && (
        <div className="v2-card v2-empty">
          <GiwiLive size={110} state={cheer % 2 ? 'excited' : 'happy'} />
          <div style={{ fontWeight: 700, fontSize: 17 }}>{t('Welcome!')}</div>
          <div className="muted small" style={{ margin: '6px 0 14px', maxWidth: 300 }}>
            {t('Set up your weekly routine to get going — or load a ready-made starter plan.')}
          </div>
          <button className="v2-btn primary" onClick={() => loadStarterPlan()}>{t('Load a starter plan')}</button>
          <button className="v2-btn" onClick={() => nav('/plan')}>{t('Build my own plan')}</button>
        </div>
      )}

      {/* glance row */}
      <div className="cols">
        <div className="v2-card tappable" onClick={() => calendarSheet()}>
          <div className="row" style={{ gap: 8 }}>
            <Icon name="flame" size={20} style={{ color: 'var(--orange)' }} />
            <b style={{ fontSize: 19 }}>{streakWeeks(S)}</b>
            <span className="muted small">{wThisWeek}{plannedPerWeek ? '/' + plannedPerWeek : ''} · {t('this week')}</span>
          </div>
          <div className="muted small" style={{ marginTop: 4 }}>{t(S.workouts.length === 1 ? '{0} workout total' : '{0} workouts total', S.workouts.length)}</div>
        </div>

        <div className="v2-card">
          <div className="row between" style={{ marginBottom: 4 }}>
            <b className="small">{t('Body weight')}</b>
            <span className="row" style={{ gap: 6 }}>
              <button className="iconbtn pressable" style={{ width: 28, height: 28 }} onClick={e => { e.stopPropagation(); goalSheet() }} aria-label={t('Goal')}><Icon name="target" size={15} /></button>
              <button className="iconbtn pressable" style={{ width: 28, height: 28 }} onClick={e => { e.stopPropagation(); bwSheet() }} aria-label={t('Log')}><Icon name="plus" size={15} /></button>
            </span>
          </div>
          {bw ? <>
            <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
              <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>{fmtNum(bw.w)}</span>
              <span className="muted small">{S.unit}</span>
              {!!delta && (
                <span className="small row" style={{ gap: 2, fontWeight: 550, color: bwDeltaColor(delta, bw.w) }}>
                  <Icon name={delta > 0 ? 'arrowUp' : 'arrowDown'} size={12} />{fmtNum(Math.abs(delta))}
                </span>
              )}
            </div>
            <LineChart points={bwPoints} h={92} unit={S.unit} goal={S.targetW} label={t('Body weight trend, last 30 days')} />
          </> : <div className="muted small">{t('No entries yet — log your weight to start the curve.')}</div>}
          {!!S.targetW && bw && (
            <div className="small row" style={{ color: 'var(--yellow)', marginTop: 4, gap: 5 }}>
              <Icon name="target" size={13} />{fmtNum(S.targetW)} {S.unit}
              {' · '}{Math.abs(S.targetW - bw.w) < 0.05 ? t('reached!') : t(S.targetW > bw.w ? '{0} to gain' : '{0} to lose', fmtNum(Math.abs(S.targetW - bw.w)) + ' ' + S.unit)}
            </div>
          )}
        </div>
      </div>

      <div className="dim small" style={{ textAlign: 'center', marginTop: 18 }}>
        {fmtDate(todayISO(), true)} · V2 shell preview — pantallas restantes en paridad
      </div>
    </div>
  )
}
