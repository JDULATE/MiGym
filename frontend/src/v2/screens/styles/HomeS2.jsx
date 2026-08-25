// S2 · EDITORIAL — light paper, Swiss typography. Type carries everything; one ink, one rule.
import { useHomeData } from '../useHomeData.js'
import { t } from '../../../lib/i18n.js'
import { fmtNum } from '../../../lib/format.js'

export default function HomeS2() {
  const d = useHomeData()
  return (
    <div className="hs2">
      <header className="hs2-top">
        <span>{d.dateCaps}</span>
        <span>{d.greetingName ? '— ' + d.greetingName : 'MiGym'}</span>
      </header>

      <main className="hs2-main">
        <div className="hs2-kicker">{d.active ? '● EN SESIÓN' : d.routine ? 'TOCA HOY' : 'DESCANSO'}</div>
        <h1 className="hs2-headline">{d.active ? d.S.active.name : d.routine ? d.routine.name : 'Descanso'}</h1>
        <div className="hs2-rule" />
        <div className="hs2-week">
          {d.days.map(day => (
            <button key={day.iso} onClick={() => d.openDay(day.iso)}
              className={'hs2-day' + (day.isToday ? ' today' : '') + (day.done ? ' done' : '')}>
              <i>{day.short}</i><b>{day.num}</b>
            </button>
          ))}
        </div>
        <button className={'hs2-start pressable' + (d.active ? ' live' : '')} onClick={d.start} disabled={d.empty}>
          {d.active ? 'REANUDAR SESIÓN' : d.routine ? 'COMENZAR ENTRENAMIENTO' : 'HOY SE DESCANSA'}
          <span>→</span>
        </button>
      </main>

      <footer className="hs2-foot">
        <span><b>{d.streak}</b> SEM RACHA</span>
        <span><b>{d.wThisWeek}/{d.plannedPerWeek || '—'}</b> ESTA SEMANA</span>
        <span><b>{d.bw ? fmtNum(d.bw.w) : '—'}</b> KG <u onClick={d.logBW}>+ registrar</u></span>
      </footer>
    </div>
  )
}
