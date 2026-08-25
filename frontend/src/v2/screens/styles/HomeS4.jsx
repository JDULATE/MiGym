// S4 · INSTRUMENT — graphite athlete panel. Mono numerals, tiles, weekly progress, slab start.
import { useHomeData } from '../useHomeData.js'
import { fmtNum } from '../../../lib/format.js'

const DAYS_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

export default function HomeS4() {
  const d = useHomeData()
  const pct = Math.min(100, Math.round((d.wThisWeek / Math.max(1, d.plannedPerWeek)) * 100))
  return (
    <div className="hs4">
      <header className="hs4-status">
        <span className={'hs4-state' + (d.active ? ' on' : '')}>
          <i /> {d.active ? 'EN SESIÓN' : d.routine ? 'READY' : 'REST DAY'}
        </span>
        <span className="hs4-date">{d.dateCaps}</span>
      </header>

      <div className="hs4-days">
        {d.days.map(day => {
          const li = new Date(day.iso + 'T12:00:00').getDay()
          return (
            <button key={day.iso} onClick={() => d.openDay(day.iso)}
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
        <div className="tile"><small>PESO</small><b>{d.bw ? fmtNum(d.bw.w) : '—'}<u>kg</u></b>
          {!!d.delta && <span className="delta">{d.delta > 0 ? '+' : ''}{fmtNum(d.delta)}</span>}</div>
        <div className="tile"><small>TOTAL</small><b>{d.totalWorkouts}</b></div>
      </div>

      <button className={'hs4-slab pressable' + (d.active ? ' live' : '')} onClick={d.start} disabled={d.empty}>
        {d.active ? '■ TERMINAR SESIÓN' : d.routine ? 'INICIAR SESIÓN ▸' : 'DÍA DE DESCANSO'}
      </button>
      <footer className="hs4-foot">
        <span>SRC local · sin nube</span>
        <button onClick={d.logBW}>+ PESO</button>
        <button onClick={d.setGoal}>META</button>
      </footer>
    </div>
  )
}
