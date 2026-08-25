// S5 · ZEN RING — production cut. One ring = the week; Start lives inside it.
// Everything else is quiet rows: racha, peso (± delta, meta), última sesión, ajustes.
import { useHomeData } from '../useHomeData.js'
import GiwiLive from '../../ui/GiwiLive.jsx'
import { fmtNum, fmtDate } from '../../../lib/format.js'

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
          <circle cx="110" cy="110" r={R} fill="none" stroke="#e8e4da" strokeWidth="7" />
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
          <b>{d.wThisWeek}/{goal}</b>
          <small>{Math.round(pct * 100)}% semana</small>
        </div>
      </div>

      {d.active && (
        <div className="hs5-livetag">● Sesión en curso — toca ❚❚ para terminar</div>
      )}

      <div className="hs5-rows">
        <div className="hs5-row" onClick={d.openCalendar}>
          <span>Racha</span><b>{d.streak} {d.streak === 1 ? 'semana' : 'semanas'} · {d.wThisWeek}/{goal}</b>
        </div>
        <div className="hs5-row" onClick={d.logBW}>
          <span>Peso</span>
          <b>{d.bw ? `${fmtNum(d.bw.w)} ${d.unit}` : '—'}
            {!!d.delta && (
              <em style={{ color: d.delta > 0 ? '#c47f17' : '#3b93f0' }}>
                {' '}{d.delta > 0 ? '+' : '−'}{fmtNum(Math.abs(d.delta))}
              </em>
            )}
            {!!d.targetW && <em style={{ color: '#8a8578' }}> · meta {fmtNum(d.targetW)}</em>}
          </b>
        </div>
        <div className="hs5-row">
          <span>Última sesión</span>
          <b>{d.lastWorkout ? `${d.lastWorkout.name} · ${fmtDate(d.lastWorkout.d, true)}` : '—'}</b>
        </div>
        <div className="hs5-row" onClick={() => d.nav('/settings')}>
          <span>Ajustes</span><b style={{ color: '#8a8578' }}>›</b>
        </div>
      </div>

      {d.empty && (
        <p className="muted small hs5-hint">
          Sin rutina aún —{' '}
          <button className="v2-minilink" onClick={d.loadStarter}>carga el plan inicial</button>
          {' '}para empezar.
        </p>
      )}
    </div>
  )
}
