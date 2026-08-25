// S4 · INSTRUMENT — production cut. Graphite athlete panel: session clock when live,
// last-session tile, weekly progress bar, mono everything, slab start.
import { useEffect, useState } from 'react'
import { useHomeData } from '../useHomeData.js'
import { fmtNum, fmtDate } from '../../../lib/format.js'

const DAYS_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const mmss = ms => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')
}

export default function HomeS4() {
  const d = useHomeData()
  const [, tick] = useState(0)
  useEffect(() => {
    if (!d.active) return
    const iv = setInterval(() => tick(n => n + 1), 1000)
    return () => clearInterval(iv)
  }, [d.active])
  // eslint-disable-next-line react-hooks/purity -- live session clock is the point
  const elapsed = d.active ? mmss(Date.now() - d.S.active.start) : null

  const pct = Math.min(100, Math.round((d.wThisWeek / Math.max(1, d.plannedPerWeek)) * 100))
  return (
    <div className="hs4">
      <header className="hs4-status">
        <span className={'hs4-state' + (d.active ? ' on' : '')}>
          <i /> {d.active ? `EN SESIÓN · ${elapsed}` : d.routine ? 'READY' : 'REST DAY'}
        </span>
        <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="hs4-cfg pressable" onClick={() => d.nav('/settings')}>CFG</button>
          <span className="hs4-date">{d.dateCaps}</span>
        </span>
      </header>

      <div className="hs4-days">
        {d.days.map(day => {
          // eslint-disable-next-line react-hooks/purity -- deriving weekday letter from stored ISO date
          const li = new Date(day.iso + 'T12:00:00').getDay()
          return (
            <button key={day.iso} onClick={() => d.openDay(day.iso)}
              title={day.done ? 'completado' : day.planned ? 'planificado' : ''}
              className={(day.isToday ? ' today' : '') + (day.done ? ' done' : day.planned ? ' plan' : '')}>
              {DAYS_LETTERS[li]}
            </button>
          )
        })}
      </div>

      <div className="hs4-grid">
        <div className="tile"><small>RACHA</small><b>{d.streak}<u>sem</u></b></div>
        <div className="tile wide">
          <small>SEMANA</small>
          <b>{d.wThisWeek}<u>/{d.plannedPerWeek || '—'}</u></b>
          <div className="bar"><i style={{ width: pct + '%' }} /></div>
        </div>
        <div className="tile" onClick={d.logBW} style={{ cursor: 'pointer' }}>
          <small>PESO</small><b>{d.bw ? fmtNum(d.bw.w) : '—'}<u>kg</u></b>
          {!!d.delta && <span className="delta">{d.delta > 0 ? '+' : ''}{fmtNum(d.delta)}</span>}
        </div>
        <div className="tile"><small>TOTAL</small><b>{d.totalWorkouts}</b></div>
        <div className="tile wide">
          <small>ÚLTIMA SESIÓN</small>
          {d.lastWorkout
            ? <b className="hs4-lastname">{d.lastWorkout.name}<u>{fmtDate(d.lastWorkout.d, true)}</u></b>
            : <b className="hs4-lastname" style={{ color: '#54606e' }}>—</b>}
        </div>
      </div>

      <button className={'hs4-slab pressable' + (d.active ? ' live' : '')} onClick={d.start} disabled={d.empty}>
        {d.active ? '■ TERMINAR SESIÓN' : d.routine ? 'INICIAR SESIÓN ▸' : 'DÍA DE DESCANSO'}
      </button>

      <footer className="hs4-foot">
        <span>SRC LOCAL · SIN NUBE</span>
        <button onClick={d.openCalendar}>CALENDARIO</button>
        <button onClick={d.logBW}>+ PESO</button>
        <button onClick={d.setGoal}>META</button>
      </footer>
    </div>
  )
}
