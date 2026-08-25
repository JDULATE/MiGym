// S5 · ZEN RING — warm minimalism. One ring = the week; Start lives inside it.
import { useHomeData } from '../useHomeData.js'
import GiwiLive from '../../ui/GiwiLive.jsx'
import { fmtNum } from '../../../lib/format.js'

export default function HomeS5() {
  const d = useHomeData()
  const goal = Math.max(1, d.plannedPerWeek)
  const pct = Math.min(1, d.wThisWeek / goal)
  const R = 88, CIRC = 2 * Math.PI * R
  const weekdayLong = new Date().toLocaleDateString('es', { weekday: 'long' })

  return (
    <div className="hs5">
      <header className="hs5-top">
        <GiwiLive size={72} state={d.active ? 'excited' : 'idle'} />
      </header>

      <div className="hs5-day">{weekdayLong}</div>

      <div className="hs5-ringwrap">
        <svg width="220" height="220" viewBox="0 0 220 220" aria-hidden>
          <circle cx="110" cy="110" r={R} fill="none" stroke="var(--sep)" strokeWidth="7" />
          <circle cx="110" cy="110" r={R} fill="none" stroke="#3b93f0" strokeWidth="7"
            strokeLinecap="round" strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - pct)}
            transform="rotate(-90 110 110)" style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.32,.72,0,1)' }} />
        </svg>
        <button className={'hs5-orb pressable' + (d.active ? ' warn' : '')} onClick={d.start} disabled={d.empty}
          aria-label={d.active ? 'Reanudar' : 'Comenzar'}>
          {d.active ? '❚❚' : '▶'}
        </button>
        <div className="hs5-ringlabel">
          <b>{d.wThisWeek}/{goal || '—'}</b>
          <small>esta semana</small>
        </div>
      </div>

      <div className="hs5-rows">
        <div className="hs5-row" onClick={d.openCalendar}>
          <span>Racha</span><b>{d.streak} {d.streak === 1 ? 'semana' : 'semanas'}</b>
        </div>
        <div className="hs5-row" onClick={d.logBW}>
          <span>Peso</span>
          <b>{d.bw ? `${fmtNum(d.bw.w)} ${d.unit}` : '—'}
            {!!d.delta && <em style={{ color: d.delta > 0 ? '#c47f17' : '#3b93f0' }}> {d.delta > 0 ? '+' : ''}{fmtNum(d.delta)}</em>}
          </b>
        </div>
        <div className="hs5-row">
          <span>Historial</span><b>{d.totalWorkouts} sesiones</b>
        </div>
      </div>

      {d.empty && (
        <p className="muted small hs5-hint">
          Sin rutina aún — carga el plan inicial para empezar.
          <button className="v2-minilink" onClick={d.loadStarter}>Cargar plan inicial</button>
        </p>
      )}
    </div>
  )
}
