// WORKOUT V2 · AURORA — focus mode. The session IS the screen: current exercise in
// display type, set rows as large touch targets with spring check feedback, integrated
// rest bar, exercise switcher as unit pills. All behavior via useWorkoutEngine (V1 parity).
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { t } from '../../lib/i18n.js'
import { exOr } from '../../lib/exercises.js'
import {
  lastEntryFor, bestWeightFor, setLabel, stepEffort, capEffort,
} from '../../lib/history.js'
import { isWarmupRow } from '../../lib/workout-model.js'
import { fmtNum, fmtDate, exCount } from '../../lib/format.js'
import Media from '../../components/Media.jsx'
import Icon from '../../components/Icon.jsx'
import { exerciseDetailSheet, exercisePicker, finishWorkout } from '../../sheets.jsx'
import { glyphOf } from '../../lib/glyphs.js'
import GiwiLive from '../ui/GiwiLive.jsx'
import { useWorkoutEngine, columnsFor, useStartChooser } from './engine.jsx'
import './workout.css'

/* ---- demo seeding: a believable push session so the skin can be judged without
   any real data. Only injects when there is no active session and this tab hasn't
   seeded yet (sessionStorage), so refreshes keep the demo stable and real sessions
   are never touched. ---- */
const DEMO_FLAG = 'migym-wkdemo'
function seedDemo() {
  const st = useStore.getState()
  if (st.S.active || sessionStorage.getItem(DEMO_FLAG)) return
  sessionStorage.setItem(DEMO_FLAG, '1')
  const start = Date.now() - 1000 * 60 * 17          // started 17 min ago
  st.update(s => {
    s.active = {
      id: 'demo', routineId: null, name: 'Demo · Empuje', start,
      entries: [
        { id: '1254', target: { sets: 4, reps: 8, rest: 90, weight: 60 },
          plan: { kind: 'up', why: ['{0} — last session you hit all sets, weight goes up', 'Press banca'] },
          sets: [
            { w: 60, r: 8, done: true }, { w: 60, r: 8, done: true },
            { w: 60, r: 8, done: false }, { w: 60, r: 8, done: false },
          ] },
        { id: '1012', target: { sets: 3, reps: 10, rest: 90, weight: 35 },
          sets: [
            { w: 35, r: 10, done: true }, { w: 35, r: 10, done: false }, { w: 35, r: 10, done: false },
          ] },
        { id: '2330', target: { sets: 3, reps: 12, rest: 60, weight: 55 },
          sets: [
            { w: 55, r: 12, done: false }, { w: 55, r: 12, done: false }, { w: 55, r: 12, done: false },
          ] },
      ],
      cur: 0,
    }
  }, true)
}
function DemoBadge({ onExit }) {
  return (
    <div style={{ position: 'fixed', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 99 }}>
      <button className="pressable" onClick={onExit}
        style={{ border: 'none', cursor: 'pointer', fontWeight: 750, fontSize: '.7rem', letterSpacing: '.08em',
          background: 'rgba(59,147,240,.16)', color: 'var(--acc)', padding: '6px 14px', borderRadius: 999 }}>
        DATOS FICTICIOS · SALIR DEL DEMO
      </button>
    </div>
  )
}

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
  const lastFor = rid => {
    const w = [...d.S.workouts].reverse().find(w => w.routineId === rid)
    return w ? fmtDate(w.d, true) : null
  }
  return (
    <div className="v2-home wk-start">
      <header className="v2-top">
        <span className="v2-datecaps">{d.dateCaps}</span>
        <button className="iconbtn pressable" onClick={() => nav('/home')} aria-label="Inicio"><Icon name="house" size={19} /></button>
      </header>

      <div style={{ padding: '18px 18px 0' }}>
        <div className="v2-kicker">ELIGE TU SESIÓN</div>
      </div>

      {!d.S.routines.length && (
        <div className="v2-card" style={{ margin: '16px 18px 0', textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Local vacío — es normal</div>
          <p className="muted small" style={{ margin: '0 0 12px' }}>
            Este navegador no tiene rutinas guardadas en localhost.
            Carga un plan inicial para probar el flujo completo.
          </p>
          <button className="v2-btn primary" onClick={d.loadStarter}>⚡ Cargar plan inicial</button>
          <div style={{ height: 6 }} />
          <button className="v2-btn" onClick={() => nav('/plan')}>Construir mi plan</button>
        </div>
      )}

      {d.todayR && (
        <button className="wk-choice today pressable" onClick={() => import('../../sheets.jsx').then(({ startFlow }) => startFlow(d.todayR.id))}>
          <span className="wk-choice-glyph">{glyphOf(d.todayR.emoji)}</span>
          <span className="wk-choice-body">
            <small>{t('Today')}{d.todayOvr ? ' · ↻' : ''}</small>
            <b>{d.todayR.name}</b>
            <span className="dim">{exCount(d.todayR.ex.length)}{lastFor(d.todayR.id) ? ` · última ${lastFor(d.todayR.id)}` : ''}</span>
          </span>
          <span className="wk-choice-go">▶</span>
        </button>
      )}

      {!!d.others.length && <div className="v2-kicker" style={{ padding: '16px 18px 8px' }}>OTRAS RUTINAS</div>}
      {d.others.map(r => (
        <button key={r.id} className="wk-choice pressable" onClick={() => import('../../sheets.jsx').then(({ startFlow }) => startFlow(r.id))}>
          <span className="wk-choice-glyph dim">{glyphOf(r.emoji)}</span>
          <span className="wk-choice-body">
            <b>{r.name}</b>
            <span className="dim">{exCount(r.ex.length)}{lastFor(r.id) ? ` · última ${lastFor(r.id)}` : ''}</span>
          </span>
          <span className="wk-choice-go dim">▶</span>
        </button>
      ))}

      <button className="wk-choice freestyle pressable" onClick={() => import('../../sheets.jsx').then(({ startFlow }) => startFlow(null))}>
        <span className="wk-choice-glyph"><Icon name="shuffle" size={20} /></span>
        <span className="wk-choice-body">
          <b>Freestyle</b>
          <span className="dim">elige ejercicios sobre la marcha</span>
        </span>
        <span className="wk-choice-go dim">＋</span>
      </button>

      {!d.S.routines.length && (
        <p className="muted small" style={{ textAlign: 'center', padding: '14px 18px' }}>
          …o registra tu peso y crea rutinas desde <b>Inicio → Ajustes</b>.
        </p>
      )}
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
  const [demoOn] = useState(() => !!sessionStorage.getItem(DEMO_FLAG))

  // seed once per tab session when there's nothing live
  useEffect(() => {
    if (!active) seedDemo()
  }, [active])

  if (!active && !demoOn) return <StartV2 />

  const exitDemo = () => {
    sessionStorage.removeItem(DEMO_FLAG)
    useStore.getState().update(s => { s.active = null }, true)
    window.location.hash = '#/app'
    location.reload()
  }

  if (!active) return <StartV2 />
  return (
    <>
      {sessionStorage.getItem(DEMO_FLAG) && <DemoBadge onExit={exitDemo} />}
      <ActiveV2 />
    </>
  )
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
