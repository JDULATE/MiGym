// S3 · GLASS PLAY — pastel mesh background, tilted glass cards, Giwi peeking behind.
import { useHomeData } from '../useHomeData.js'
import GiwiLive from '../../ui/GiwiLive.jsx'
import { t } from '../../../lib/i18n.js'
import { glyphOf } from '../../../lib/glyphs.js'
import { fmtNum } from '../../../lib/format.js'

export default function HomeS3() {
  const d = useHomeData()
  return (
    <div className="hs3">
      <header className="hs3-top">
        <span className="hs3-hi">{d.greetingName ? 'Hola, ' + d.greetingName : 'MiGym'}</span>
        <span className="hs3-date">{d.dateLong}</span>
      </header>

      <div className="hs3-stack">
        <section className="hs3-card tilt-l">
          <GiwiLive size={84} state={d.active ? 'excited' : 'happy'} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <small>{d.active ? 'EN CURSO' : d.routine ? 'TOCA HOY' : 'DESCANSO'}</small>
            <h1>{d.active ? d.S.active.name : d.routine ? d.routine.name : 'Descanso'}</h1>
          </div>
        </section>

        <section className="hs3-card tilt-r">
          <div className="hs3-todayrow">
            {d.routine && <span className="hs3-glyph">{glyphOf(d.routine.emoji)}</span>}
            <button className={'hs3-start pressable' + (d.active ? ' warn' : '')} onClick={d.start} disabled={d.empty}>
              {d.active ? 'REANUDAR' : d.routine ? '▶ COMENZAR' : 'DESCANSO'}
            </button>
          </div>
        </section>

        <section className="hs3-card">
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
            <span>📅 <b>{d.wThisWeek}/{d.plannedPerWeek || '—'}</b></span>
            <span>⚖️ <b>{d.bw ? fmtNum(d.bw.w) : '—'}</b> kg</span>
            <button className="hs3-log" onClick={d.logBW}>+ peso</button>
          </div>
        </section>
      </div>
    </div>
  )
}
