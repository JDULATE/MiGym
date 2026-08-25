// S2 · EDITORIAL — production cut. Swiss paper; type is the interface. One ink, one rule,
// one accent. Giwi deliberately absent here: restraint IS the style's signature.
import { useHomeData } from '../useHomeData.js'
import { t } from '../../../lib/i18n.js'
import { fmtNum, exCount, fmtDate } from '../../../lib/format.js'

export default function HomeS2() {
  const d = useHomeData()
  const dot = d.active ? '● ' : ''
  return (
    <div className="hs2">
      <header className="hs2-top">
        <span>{d.dateCaps}</span>
        <span>
          {d.greetingName ? d.greetingName + ' · ' : ''}
          <u onClick={() => d.nav('/settings')}>ajustes</u>
        </span>
      </header>

      <main className="hs2-main">
        <div className="hs2-kicker">
          {d.active ? <><i className="hs2-pulse" /> EN SESIÓN</> : d.routine ? (d.todayOvr ? 'TOCA HOY · REPROGRAMADO' : 'TOCA HOY') : 'DESCANSO'}
        </div>
        <h1 className="hs2-headline">{d.active ? d.S.active.name : d.routine ? d.routine.name : 'Descanso'}</h1>
        {d.routine && (
          <div className="hs2-metaline">
            {exCount(d.routine.ex.length)} · {d.plannedPerWeek}/semana planificados
            {d.lastWorkout && <> · última sesión: {d.lastWorkout.name}, {fmtDate(d.lastWorkout.d, true)}</>}
          </div>
        )}
        <div className="hs2-rule" />

        <div className="hs2-week">
          {d.days.map(day => (
            <button key={day.iso} onClick={() => d.openDay(day.iso)}
              className={'hs2-day' + (day.isToday ? ' today' : '') + (day.done ? ' done' : '')}
              title={day.done ? 'completado' : day.planned ? 'planificado' : ''}>
              <i>{day.short}</i><b>{day.num}</b>
            </button>
          ))}
          <button className="hs2-day hs2-cal" onClick={d.openCalendar} title="Calendario">⋯</button>
        </div>

        <button className={'hs2-start pressable' + (d.active ? ' live' : '')} onClick={d.start} disabled={d.empty}>
          <span>{dot}{d.active ? 'REANUDAR SESIÓN' : d.routine ? 'COMENZAR ENTRENAMIENTO' : 'HOY SE DESCANSA'}</span>
          <span>→</span>
        </button>

        {d.empty && (
          <p className="hs2-emptynote">
            Aún no tienes rutinas.
            <u onClick={d.loadStarter}>Cargar el plan inicial</u> o
            <u onClick={() => d.nav('/plan')}>construir el mío</u>.
          </p>
        )}
      </main>

      <footer className="hs2-foot">
        <span><b>{d.streak}</b> SEM RACHA</span>
        <span><b>{d.wThisWeek}/{d.plannedPerWeek || '—'}</b> SEMANA</span>
        <span><b>{d.bw ? fmtNum(d.bw.w) : '—'}</b> KG
          {!!d.delta && <em style={{ color: '#3b93f0', fontStyle: 'normal' }}> {d.delta > 0 ? '+' : '−'}{fmtNum(Math.abs(d.delta))}</em>}
          {' '}<u onClick={d.logBW}>±</u>
        </span>
        {!!d.targetW && <span>META <b>{fmtNum(d.targetW)}</b></span>}
      </footer>
    </div>
  )
}
