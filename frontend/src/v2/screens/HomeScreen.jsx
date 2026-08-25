// Home V2.1 — immersive scene, not a settings list.
// The first viewport IS today's session: ghost glyph backdrop, display-scale title,
// one physical Start orb, Giwi floating in the scene. Below the fold: draggable week
// strip and hairline glance stats — no card boxes; type + whitespace carry hierarchy.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { effectiveRoutine, lastBW, streakWeeks } from '../../lib/history.js'
import { fmtNum, todayISO, isoOf, weekKey, DAYS, exCount } from '../../lib/format.js'
import { t, dateLocale } from '../../lib/i18n.js'
import { bwSheet, goalSheet, dayOverrideSheet, calendarSheet, startFlow, loadStarterPlan, bwDeltaColor } from '../../sheets.jsx'
import Icon from '../../components/Icon.jsx'
import { glyphOf } from '../../lib/glyphs.js'
import GiwiLive from '../ui/GiwiLive.jsx'

export default function HomeScreen({ onGoSettings }) {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const [cheer, setCheer] = useState(0)

  const today = new Date()
  const routine = effectiveRoutine(S, todayISO())
  const bw = lastBW(S)
  const prevBW = S.bodyweight.length > 1 ? S.bodyweight[S.bodyweight.length - 2] : null
  const delta = bw && prevBW ? bw.w - prevBW.w : null
  const empty = !S.routines.length && !S.active

  const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const doneDays = new Set(S.workouts.map(w => w.d))
  const wThisWeek = S.workouts.filter(w => weekKey(w.d) === weekKey(todayISO())).length
  const plannedPerWeek = Object.keys(S.week).filter(k => S.week[k]).length

  const onToday = () => {
    if (S.active) return nav('/workout')
    if (routine) { setCheer(c => c + 1); return startFlow(routine.id) }
    return dayOverrideSheet(todayISO())
  }

  const dateLine = today.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'short' })

  return (
    <div className="v2-home">
      <header className="v2-top">
        <span className="v2-datecaps">{dateLine.toUpperCase()}</span>
        <button className="iconbtn pressable" onClick={onGoSettings} aria-label={t('Settings')}><Icon name="gear" size={19} /></button>
      </header>

      {/* THE SCENE — first viewport is the workout itself */}
      <section className={'v2-stage-home' + (S.active ? ' live' : '') + (routine ? '' : ' rest')}>
        <div className="v2-ghost" aria-hidden>{routine ? glyphOf(routine.emoji) : '☾'}</div>
        {!empty && (
          <div style={{ position: 'absolute', right: '6%', top: '12%' }}>
            <GiwiLive size={92} state={S.active ? 'excited' : cheer % 2 ? 'curious' : 'happy'} />
          </div>
        )}
        <div className="v2-kicker">{S.active ? t('In progress') : routine ? t('Today') : t('Rest day')}</div>
        <h1 className="v2-display">
          {S.active ? S.active.name : routine ? routine.name : t('Rest day')}
        </h1>
        {routine && !S.active && (
          <div className="v2-meta">{exCount(routine.ex.length)}{plannedPerWeek ? ` · ${plannedPerWeek}/semana` : ''}</div>
        )}
        <button
          className={'v2-orb pressable' + (S.active ? ' warn' : '') + (empty ? ' ghosted' : '')}
          onClick={onToday}
          disabled={empty}>
          <Icon name={S.active ? 'pause' : 'play'} size={22} />
          <span>{S.active ? t('Resume') : routine ? t('Start') : t('Rest')}</span>
        </button>
        {S.active && <div className="v2-livebar"><i /></div>}
      </section>

      {/* week rail — horizontal drag/scroll, no box */}
      <div className="v2-rail">
        {[1, 2, 3, 4, 5, 6, 0].map(off => {
          const d = new Date(monday); d.setDate(monday.getDate() + off)
          const iso = isoOf(d)
          const done = doneDays.has(iso), planned = !!S.week[d.getDay()]
          return (
            <button key={iso} className={'v2-rday' + (iso === todayISO() ? ' today' : '')}
              onClick={() => dayOverrideSheet(iso)}>
              <span className="lbl">{t(DAYS[d.getDay()]).slice(0, 2).toUpperCase()}</span>
              <span className="num">{d.getDate()}</span>
              <span className={'rail-dot' + (done ? ' done' : planned ? ' plan' : '')} />
            </button>
          )
        })}
      </div>

      {/* glance stats — big numbers, hairlines, zero boxes */}
      <section className="v2-glances">
        <div className="v2-glance" onClick={() => calendarSheet()} role="button" tabIndex={0}>
          <big>{streakWeeks(S)}</big>
          <small>{t('this week')}<br />{wThisWeek}/{plannedPerWeek || '—'}</small>
        </div>
        <div className="v2-glance">
          <big>{bw ? fmtNum(bw.w) : '—'}<em>{bw ? S.unit : ''}</em></big>
          <small className="row" style={{ justifyContent: 'center', gap: 4 }}>
            {!!delta && <>
              <Icon name={delta > 0 ? 'arrowUp' : 'arrowDown'} size={11}
                style={{ color: bwDeltaColor(delta, bw.w) }} />
              {fmtNum(Math.abs(delta))} ·{' '}
            </>}
            <button className="v2-minilink" onClick={e => { e.stopPropagation(); bwSheet() }}>{t('Log')}</button>
            <button className="v2-minilink" onClick={e => { e.stopPropagation(); goalSheet() }}>{S.targetW ? fmtNum(S.targetW) : t('Goal')}</button>
          </small>
        </div>
      </section>

      {empty && (
        <div className="v2-empty-scene">
          <p className="muted small" style={{ maxWidth: 320 }}>
            {t('Set up your weekly routine to get going — or load a ready-made starter plan.')}
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="v2-btn primary" style={{ width: 'auto', padding: '11px 20px' }} onClick={() => loadStarterPlan()}>{t('Load a starter plan')}</button>
            <button className="v2-btn" style={{ width: 'auto', padding: '11px 20px' }} onClick={() => nav('/plan')}>{t('Build my own plan')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
