// S3 · GLASS PLAY — production cut. Mesh pastel + tilted glass cards; weight sparkline
// gets its own glass card; Giwi peeks from behind the today card.
import { useHomeData } from '../useHomeData.js'
import GiwiLive from '../../ui/GiwiLive.jsx'
import { glyphOf } from '../../../lib/glyphs.js'
import { fmtNum } from '../../../lib/format.js'
import LineChart from '../../../components/LineChart.jsx'

export default function HomeS3() {
  const d = useHomeData()
  return (
    <div className="hs3">
      <header className="hs3-top">
        <span className="hs3-hi">{d.greetingName ? 'Hola, ' + d.greetingName : 'MiGym'}</span>
        <span className="hs3-date">{d.dateLong}</span>
      </header>

      <button className="hs3-gear pressable" onClick={() => d.nav('/settings')} aria-label="Ajustes">⚙</button>

      <div className="hs3-stack">
        <section className="hs3-card tilt-l">
          {!d.empty && (
            <div style={{ position: 'relative', zIndex: 0 }}>
              <GiwiLive size={84} state={d.active ? 'excited' : 'happy'} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <small>
              {d.active ? 'EN CURSO' : d.routine ? (d.todayOvr ? 'TOCA HOY · REPROGRAMADO' : 'TOCA HOY') : 'DESCANSO'}
            </small>
            <h1>{d.active ? d.S.active.name : d.routine ? d.routine.name : 'Descanso'}</h1>
          </div>
          {d.routine && !d.active && <span className="hs3-glyph">{glyphOf(d.routine.emoji)}</span>}
        </section>

        <section className="hs3-card tilt-r">
          <div className="hs3-todayrow">
            <button className={'hs3-start pressable' + (d.active ? ' warn' : '')} onClick={d.start} disabled={d.empty}>
              {d.active ? '❚❚ REANUDAR' : d.routine ? '▶ COMENZAR' : 'DESCANSO'}
            </button>
            {d.routine && <span className="hs3-count">{d.routine.ex.length} ejercicios</span>}
          </div>
        </section>

        <section className="hs3-card">
          <small className="hs3-label">ESTA SEMANA</small>
          <div className="hs3-week">
            {d.days.map(day => (
              <button key={day.iso} onClick={() => d.openDay(day.iso)}
                className={(day.isToday ? ' today' : '') + (day.done ? ' done' : day.planned ? ' plan' : '')}>
                <i>{day.short}</i><b>{day.num}</b>
              </button>
            ))}
          </div>
          <div className="hs3-stats">
            <span>🔥 <b>{d.streak}</b> sem</span>
            <span>✓ <b>{d.wThisWeek}/{d.plannedPerWeek || '—'}</b></span>
            <span>Σ <b>{d.totalWorkouts}</b></span>
          </div>
        </section>

        <section className="hs3-card tilt-l" onClick={d.logBW} style={{ cursor: 'pointer' }}>
          <small className="hs3-label">PESO CORPORAL</small>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <b style={{ fontSize: '1.6rem', letterSpacing: '-.02em', color: '#20242c' }}>
              {d.bw ? fmtNum(d.bw.w) : '—'}
            </b>
            <span style={{ color: '#6b7280', fontSize: '.8rem' }}>{d.bw ? d.unit : ''}</span>
            {!!d.delta && (
              <span style={{ fontSize: '.78rem', fontWeight: 700, color: d.delta > 0 ? '#c47f17' : '#2b6cb0' }}>
                {d.delta > 0 ? '▲' : '▼'} {fmtNum(Math.abs(d.delta))}
              </span>
            )}
            {!!d.targetW && <span style={{ marginLeft: 'auto', fontSize: '.72rem', color: '#6b7280' }}>meta {fmtNum(d.targetW)}</span>}
          </div>
          {d.bwPoints.length > 1 && (
            <div style={{ marginTop: 8 }}>
              <LineChart points={d.bwPoints} h={72} unit={d.unit} goal={d.targetW}
                label="Tendencia de peso, últimos 30 días" />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
