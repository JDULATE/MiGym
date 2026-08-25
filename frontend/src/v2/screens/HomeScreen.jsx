// HOME V2 · AURORA — ganadora del bake-off (2026-08-25), con la física de botones
// de Editorial (.pressable en TODO elemento interactivo). Motores: useHomeData +
// sheets + LineChart — cero lógica duplicada. Estilos: v2.css + styles/homeStyles.css.
import { useHomeData } from './useHomeData.js'
import GiwiLive from '../ui/GiwiLive.jsx'
import { t } from '../../lib/i18n.js'
import { glyphOf } from '../../lib/glyphs.js'
import { exCount, fmtNum } from '../../lib/format.js'
import LineChart from '../../components/LineChart.jsx'
import Icon from '../../components/Icon.jsx'
import './styles/homeStyles.css'

export default function HomeScreen({ onGoSettings }) {
  const d = useHomeData()
  return (
    <div className="v2-home hs1">
      <header className="v2-top">
        <span className="v2-datecaps">{d.dateCaps}</span>
        <button className="iconbtn pressable" onClick={onGoSettings} aria-label={t('Settings')}>
          <Icon name="gear" size={19} />
        </button>
      </header>

      <section className={'v2-stage-home' + (d.active ? ' live' : '') + (d.routine ? '' : ' rest')}>
        <div className="v2-ghost" aria-hidden>{d.routine ? glyphOf(d.routine.emoji) : '☾'}</div>
        {!d.empty && (
          <div style={{ position: 'absolute', right: '6%', top: '10%' }}>
            <GiwiLive size={92} state={d.active ? 'excited' : d.routine ? 'happy' : 'idle'} />
          </div>
        )}
        <div className="v2-kicker">
          {d.active ? t('In progress') : d.todayOvr ? t('Today') + ' · ' + t('rescheduled') : d.routine ? t('Today') : t('Rest day')}
        </div>
        <h1 className="v2-display">{d.active ? d.S.active.name : d.routine ? d.routine.name : t('Rest day')}</h1>
        {d.routine && !d.active && <div className="v2-meta">{exCount(d.routine.ex.length)}</div>}
        <button className={'v2-orb pressable' + (d.active ? ' warn' : '')} onClick={d.start} disabled={d.empty}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
            {d.active ? '❚❚' : '▶'}<span>{d.active ? t('Resume') : d.routine ? t('Start') : t('Rest')}</span>
          </span>
        </button>
        {d.active && <div className="v2-livebar"><i /></div>}
      </section>

      {/* week rail — cada día responde al tacto como los botones de Editorial */}
      <div className="v2-rail">
        {d.days.map(day => (
          <button key={day.iso}
            className={'v2-rday pressable' + (day.isToday ? ' today' : '')}
            onClick={() => d.openDay(day.iso)}
            title={day.done ? '✓' : day.planned ? '•' : ''}>
            <span className="lbl">{day.short}</span><span className="num">{day.num}</span>
            <span className={'rail-dot' + (day.done ? ' done' : day.planned ? ' plan' : '')} />
          </button>
        ))}
      </div>

      <section className="v2-glances hs1-glances">
        <div className="v2-glance pressable" onClick={d.openCalendar} role="button" tabIndex={0}>
          <big><Icon name="flame" size={18} style={{ color: '#7db8f5', verticalAlign: '-2px', marginRight: 6 }} />{d.streak}</big>
          <small>semanas de racha<br />{d.wThisWeek}/{d.plannedPerWeek || '—'} esta semana</small>
        </div>
        <div className="v2-glance hs1-weight">
          <big>{d.bw ? <>{fmtNum(d.bw.w)}<em>{d.unit}</em></> : '—'}
            {!!d.delta && (
              <span className="hs1-delta">
                <Icon name={d.delta > 0 ? 'arrowUp' : 'arrowDown'} size={11} />
                {fmtNum(Math.abs(d.delta))}
              </span>
            )}
          </big>
          <small>
            {d.targetW ? <>meta {fmtNum(d.targetW)} {d.unit}</> : 'peso corporal'}
            {' · '}<button className="v2-minilink pressable" onClick={e => { e.stopPropagation(); d.logBW() }}>registrar</button>
          </small>
          {d.bwPoints.length > 1 && (
            <div className="hs1-chart" onClick={e => e.stopPropagation()}>
              <LineChart points={d.bwPoints} h={64} unit={d.unit} goal={d.targetW}
                label={t('Body weight trend, last 30 days')} />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
