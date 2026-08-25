// WORKOUT V2 · AURORA — focus mode. The session IS the screen: current exercise in
// display type, set rows as large touch targets with spring check feedback, integrated
// rest bar, exercise switcher as unit pills. All behavior via useWorkoutEngine (V1 parity).
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { exOr } from '../../lib/exercises.js'
import {
  lastEntryFor, bestWeightFor, setLabel, stepEffort,
} from '../../lib/history.js'
import { isWarmupRow } from '../../lib/workout-model.js'
import { fmtNum, fmtDate } from '../../lib/format.js'
import { t } from '../../lib/i18n.js'
import Media from '../../components/Media.jsx'
import Icon from '../../components/Icon.jsx'
import { exerciseDetailSheet, exercisePicker, finishWorkout } from '../../sheets.jsx'
import { glyphOf } from '../../lib/glyphs.js'
import GiwiLive from '../ui/GiwiLive.jsx'
import { useWorkoutEngine, columnsFor, useStartChooser } from './engine.jsx'
import './workout.css'

/* elapsed clock isolated per second-tick */
function Elapsed({ start }) {
  const [txt, setTxt] = useState('0:00')
  useEffect(() => {
    const tick = () => { const s = Math.floor((Date.now() - start) / 1000); setTxt(Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')) }
    tick(); const iv = setInterval(tick, 1000); return () => clearInterval(iv)
  }, [start])
  return <span>{txt}</span>
}

function StartV2() {
  const nav = useNavigate()
  const d = useStartChooser()
  return (
    <div className="v2-home">
      <header className="v2-top">
        <span className="v2-datecaps">{d.dateCaps}</span>
        <button className="iconbtn pressable" onClick={() => nav('/home')} aria-label="Inicio"><Icon name="house" size={19} /></button>
      </header>
      <section className={'v2-stage-home' + (d.todayR ? '' : ' rest')}>
        <div className="v2-ghost" aria-hidden>{d.todayR ? glyphOf(d.todayR.emoji) : '☾'}</div>
        <div className="v2-kicker">SIN SESIÓN ACTIVA</div>
        <h1 className="v2-display">{d.todayR ? d.todayR.name : t('Rest day')}{d.todayOvr ? ' ·↻' : ''}</h1>
        <button className="v2-orb pressable" disabled={!d.todayR} onClick={() => import('../../sheets.jsx').then(({ startFlow }) => startFlow(d.todayR.id))}>
          ▶ <span>{t('Start')}</span>
        </button>
      </section>
      {!!d.others.length && (
        <div style={{ padding: '6px 18px' }}>
          <div className="v2-kicker" style={{ margin: '10px 0 8px' }}>OTRAS RUTINAS</div>
          {d.others.map(r => (
            <button key={r.id} className="hs5-row pressable" onClick={() => import('../../sheets.jsx').then(({ startFlow }) => startFlow(r.id))}>
              <span>{glyphOf(r.emoji)} {r.name}</span><b>{r.ex.length} ej</b>
            </button>
          ))}
        </div>
      )}
      <div style={{ textAlign: 'center', paddingBottom: 30 }}>
        <button className="v2-minilink" onClick={() => import('../../sheets.jsx').then(({ startFlow }) => startFlow(null))}>
          ⚡ Freestyle — elegir sobre la marcha
        </button>
      </div>
    </div>
  )
}

function SetRowV2({ S, entry, s, i, cols, engine }) {
  const warm = isWarmupRow(s)
  const phaseNum = entry.sets.slice(0, i + 1).filter(x => isWarmupRow(x) === warm).length
  const bump = (col, dir) => {
    if (col.eff) return engine.setField(engine.cur, i, col.f, stepEffort(col.eff, s[col.f], dir))
    engine.setField(engine.cur, i, col.f, Math.max(0, Math.round(((s[col.f] || 0) + dir * col.step) * 100) / 100))
  }
  const cell = (col, cls) => (
    <div className={'wk-cell ' + cls}>
      <button className="wk-bump pressable" onClick={() => bump(col, -1)} aria-label="−"><Icon name="minus" size={14} /></button>
      <input className="wk-val" inputMode="decimal" value={s[col.f] ?? ''}
        onChange={e => {
          const v = e.target.value === '' ? null : Number(e.target.value)
          engine.setField(engine.cur, i, col.f, col.eff ? capEffort(col.eff, v) : (Number.isNaN(v) ? null : v))
        }} />
      <button className="wk-bump pressable" onClick={() => bump(col, 1)} aria-label="+"><Icon name="plus" size={14} /></button>
    </div>
  )
  return (
    <div key={i} data-giwi={i === 0 ? 'set-row' : undefined}
      className={'wk-setrow pressable' + (s.done ? ' done' : '') + (cols.col3 ? ' has-eff' : '')}
      onClick={() => engine.toggle(engine.cur, i)}>
      {warm && i > 0 && !isWarmupRow(entry.sets[i - 1]) && <div className="wk-sep" />}
      <span className="wk-n">{phaseNum}</span>
      {cell(cols.col1, 'c1')}
      {cols.col2 && cell(cols.col2, 'c2')}
      {cols.col3 && cell(cols.col3, 'c3')}
      {cols.timed && (
        <button className="wk-go pressable" disabled={s.done || !!engine.work}
          onClick={e => { e.stopPropagation(); engine.startTimed(engine.cur, i) }} aria-label="▶ hold">
          <Icon name="play" size={16} />
        </button>
      )}
      <span className={'wk-check' + (s.done ? ' on' : '')}><Icon name="check" size={15} /></span>
    </div>
  )
}

function ExerciseFocus({ engine }) {
  const { A, cur, S } = engine
  const entry = A.entries[cur]
  const ex = exOr(entry.id)
  const cols = columnsFor(S, entry)
  const last = lastEntryFor(S, entry.id)
  const best = bestWeightFor(S, entry.id)
  const plan = entry.plan

  return (
    <>
      <Media ex={ex} key={entry.id} compact minimizable />
      <div className="row between" style={{ marginTop: 4 }}>
        <h2 className="wk-exname">{ex.n}</h2>
        <button className="iconbtn pressable" onClick={() => exerciseDetailSheet(ex)} aria-label="info"><Icon name="info" size={17} /></button>
      </div>
      <div className="wk-tags">
        {entry.target?.rirTarget != null && <span className="tag acc nocap">RIR ≤ {entry.target.rirTarget}</span>}
        {best > 0 && <span className="tag nocap">{t('Best:')} {fmtNum(best)} {S.unit}</span>}
        {(ex.tg || ex.bp) && <span className="tag">{t(ex.tg || ex.bp)}</span>}
      </div>
      {last && <div className="wk-lasttime">{t('Last time')} ({fmtDate(last.d)}): {last.sets.map(s => setLabel(entry.id, s, last.target)).join(', ')}</div>}
      {plan && plan.why && plan.kind !== 'off' && (
        <div className={'wk-progline' + (plan.kind === 'deload' ? ' warn' : '')}>
          <Icon name={plan.kind === 'up' ? 'arrowUp' : 'lightbulb'} size={13} />
          <span>{t(...plan.why)}</span>
        </div>
      )}

      <div className="wk-setcard" data-giwi="exercise">
        <div className={'wk-sethead' + (cols.col3 ? ' eff3' : '')}>
          <span />
          <span>{cols.col1.hd}</span>
          {cols.col2 && <span>{cols.col2.hd}</span>}
          {cols.col3 && <span>{cols.col3.hd}</span>}
          {cols.timed && <span />}
          <span />
        </div>
        {entry.sets.map((s, i) => (
          <SetRowV2 key={i} S={S} entry={entry} s={s} i={i} cols={cols} engine={engine} />
        ))}
        <div className="wk-settools">
          <button className="pressable" onClick={() => engine.addWarmup(cur)}>🔥 Calentamiento</button>
          <button className="pressable" disabled={entry.sets.length <= 1} onClick={() => engine.removeSet(cur)}>− Set</button>
          <button className="pressable" onClick={() => engine.addSet(cur)}>+ Set</button>
        </div>
      </div>

      {!engine.isSuperset && (engine.onPairPrev || engine.onPairNext) && (
        <div className="wk-pairrow">
          {engine.onPairPrev && <button className="v2-minilink" onClick={engine.onPairPrev}>🔗 Superserie con anterior</button>}
          {engine.onPairNext && <button className="v2-minilink" onClick={engine.onPairNext}>🔗 con siguiente</button>}
        </div>
      )}
    </>
  )
}

export default function WorkoutLive() {
  const active = useStore(s => s.S.active)
  if (!active) return <StartV2 />
  return <ActiveV2 />
}

function ActiveV2() {
  const nav = useNavigate()
  const engine = useWorkoutEngine()
  const { A, units, unitIdx, cur, total, done, isSuperset } = engine
  const pct = total ? (done / total) * 100 : 0
  const [, tick] = useState(0)
  useEffect(() => { const iv = setInterval(() => tick(n => n + 1), 30000); return () => clearInterval(iv) }, [])

  if (!A.entries.length) return (
    <div className="v2-home wk-empty">
      <Icon name="shuffle" size={44} style={{ opacity: .4 }} />
      <p className="muted">Freestyle — añade tu primer ejercicio.</p>
      <button className="v2-orb" onClick={() => import('../../sheets.jsx').then(({ exercisePicker }) =>
        exercisePicker(ex => engine.addExercise(ex)))}>+ Ejercicio</button>
    </div>
  )

  return (
    <div className="v2-home wk">
      <header className="wk-top">
        <button className="iconbtn pressable" onClick={engine.discard} aria-label="Descartar"><Icon name="xmark" size={18} /></button>
        <div className="wk-title">
          <b>{A.name}</b>
          <span><Elapsed start={A.start} /> · {done}/{total} sets</span>
        </div>
        <button className="iconbtn pressable wk-finish" onClick={finishWorkout} aria-label="Terminar"><Icon name="check" size={19} /></button>
      </header>
      <div className="wk-prog"><i style={{ width: pct + '%' }} /></div>

      {/* unit switcher */}
      <div className="wk-units">
        {units.map((u, i) => (
          <button key={i} className={'wk-upill pressable' + (i === unitIdx ? ' on' : '')}
            onClick={() => engine.goUnit(i)}>{i + 1}</button>
        ))}
        <button className="wk-upill add pressable" onClick={() => import('../../sheets.jsx').then(({ exercisePicker }) =>
          exercisePicker(ex => engine.addExercise(ex)))}>+</button>
      </div>

      {isSuperset && (
        <div className="wk-ssnote">
          <Icon name="link" size={13} /> Superserie {unitIdx + 1}/{units.length} — seguidas, descansas al terminar
          <button className="v2-minilink" onClick={() => engine.unpairAt(cur)}>desunir</button>
        </div>
      )}

      <ExerciseFocus engine={engine} />

      {!isSuperset && (
        <div className="wk-nav">
          <button className="pressable" disabled={unitIdx <= 0} onClick={() => engine.goUnit(unitIdx - 1)}>← Anterior</button>
          <GiwiLive size={64} state={done === total ? 'celebrate' : done > 0 ? 'encourage' : 'idle'} />
          <button className="pressable" disabled={unitIdx >= units.length - 1} onClick={() => engine.goUnit(unitIdx + 1)}>Siguiente →</button>
        </div>
      )}

      <div style={{ textAlign: 'center', padding: '10px 0 26px' }}>
        <button className="v2-btn primary" style={{ width: 'auto', padding: '13px 26px' }} onClick={finishWorkout}>
          Terminar entrenamiento
        </button>
        <div style={{ height: 6 }} />
        <button className="v2-minilink" style={{ color: 'var(--red)' }} disabled={!!engine.work} onClick={engine.removeExerciseSheet}>
          quitar ejercicio actual
        </button>
      </div>
    </div>
  )
}
