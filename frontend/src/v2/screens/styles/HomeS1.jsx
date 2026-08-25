// S1 · AURORA — dark immersive scene. Blue gradients only; ghost glyph; orb start.
import { useHomeData } from '../useHomeData.js'
import GiwiLive from '../../ui/GiwiLive.jsx'
import { t } from '../../../lib/i18n.js'
import { glyphOf } from '../../../lib/glyphs.js'
import { exCount, fmtNum } from '../../../lib/format.js'

export default function HomeS1() {
  const d = useHomeData()
  return (
    <div className="v2-home hs1">
      <header className="v2-top">
        <span className="v2-datecaps">{d.dateCaps}</span>
      </header>
      <section className={'v2-stage-home' + (d.active ? ' live' : '') + (d.routine ? '' : ' rest')}>
        <div className="v2-ghost" aria-hidden>{d.routine ? glyphOf(d.routine.emoji) : '☾'}</div>
        {!d.empty && <div style={{ position: 'absolute', right: '6%', top: '11%' }}><GiwiLive size={92} state={d.active ? 'excited' : 'happy'} /></div>}
        <div className="v2-kicker">{d.active ? t('In progress') : d.routine ? t('Today') : t('Rest day')}</div>
        <h1 className="v2-display">{d.active ? d.S.active.name : d.routine ? d.routine.name : t('Rest day')}</h1>
        {d.routine && !d.active && <div className="v2-meta">{exCount(d.routine.ex.length)}</div>}
        <button className={'v2-orb pressable' + (d.active ? ' warn' : '')} onClick={d.start} disabled={d.empty}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
            {d.active ? '❚❚' : '▶'}<span>{d.active ? t('Resume') : d.routine ? t('Start') : t('Rest')}</span>
          </span>
        </button>
      </section>
      <div className="v2-rail">
        {d.days.map(day => (
          <button key={day.iso} className={'v2-rday' + (day.isToday ? ' today' : '')} onClick={() => d.openDay(day.iso)}>
            <span className="lbl">{day.short}</span><span className="num">{day.num}</span>
            <span className={'rail-dot' + (day.done ? ' done' : day.planned ? ' plan' : '')} />
          </button>
        ))}
      </div>
      <section className="v2-glances">
        <div className="v2-glance" onClick={d.openCalendar}><big>{d.streak}</big><small>semanas<br />{d.wThisWeek}/{d.plannedPerWeek || '—'}</small></div>
        <div className="v2-glance">
          <big>{d.bw ? <>{fmtNum(d.bw.w)}<em>{d.unit}</em></> : '—'}</big>
          <small>{d.bw ? <>peso{d.delta != null ? ` · ${d.delta > 0 ? '+' : '−'}${Math.abs(d.delta).toFixed(1)}` : ''}</> : 'sin datos'}
            {' · '}<button className="v2-minilink" onClick={e => { e.stopPropagation(); d.logBW() }}>registrar</button></small>
        </div>
      </section>
    </div>
  )
}
