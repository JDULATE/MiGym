import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { exOr } from '../lib/exercises.js'
import { uid } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { supersetUnits, cleanupSg, exLine } from '../lib/history.js'
import { Thumb } from '../components/Media.jsx'
import { glyphPicker, exercisePicker, exConfigSheet, confirmSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { glyphOf } from '../lib/glyphs.js'
import { Button, ListItem, SelectRow } from '../components/ui.jsx'
import { POLICIES_FOR, POLICY_NAME, POLICY_DESC } from '../lib/progression.js'
import BodyMap from '../components/BodyMap.jsx'
import { loadOfRoutine, rankOf, MUSCLE_NAME } from '../lib/muscles.js'

export default function RoutineEdit() {
  const nav = useNavigate()
  const { id } = useParams()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const r = S.routines.find(x => x.id === id)

  // ---- drag-to-reorder state (must live above any early return) ----
  const rowRefs = useRef({})
  const [rowStep, setRowStep] = useState(80)   // row height + list gap, measured
  const [drag, setDrag] = useState(null)       // { i, start, dy }

  useEffect(() => { if (!r) nav('/plan') }, [!!r])
  if (!r) return null

  const edit = fn => update(s => { fn(s.routines.find(x => x.id === id).ex) })
  const move = (i, dir) => edit(ex => { const j = i + dir; if (j < 0 || j >= ex.length) return;[ex[i], ex[j]] = [ex[j], ex[i]]; cleanupSg(ex) })
  const toggleLink = i => edit(ex => {
    if (i < 1) return
    const cur = ex[i], prev = ex[i - 1]
    if (cur.sg && prev.sg && cur.sg === prev.sg) delete cur.sg
    else { const gid = prev.sg || ('sg' + uid()); prev.sg = gid; cur.sg = gid }
    cleanupSg(ex)
  })

  const units = supersetUnits(r.ex)
  const unitFirst = new Set(units.filter(u => u.length > 1).map(u => u[0]))
  const inSS = new Set(units.filter(u => u.length > 1).flat())

  // ---- drag-to-reorder (direct manipulation, spec §18) ----
  // The grip handle captures the pointer and the row follows the finger 1:1; siblings
  // between origin and hover shift by one row height. The reorder commits on release —
  // until then nothing is written to state, so a cancelled drag costs nothing.
  const onDragStart = (e, i) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDrag({ i, start: e.clientY, dy: 0 })
  }
  const onDragMove = e => {
    if (!drag) return
    const dy = e.clientY - drag.start
    const over = Math.max(0, Math.min(r.ex.length - 1, drag.i + Math.round(dy / rowStep)))
    setDrag({ ...drag, dy, over })
  }
  const onDragEnd = () => {
    setDrag(d => {
      if (d) edit(ex => {
        const [row] = ex.splice(d.i, 1)
        ex.splice(d.over, 0, row)
        cleanupSg(ex)
      })
      return null
    })
  }

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/plan')} aria-label={t('Plan')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, margin: '0 12px' }}>
        <input className="input" defaultValue={r.name} style={{ fontWeight: 600, fontSize: 20, letterSpacing: '-.021em' }}
          onChange={e => update(s => { s.routines.find(x => x.id === id).name = e.target.value.trim() || t('Routine') })} />
      </div>
      <button className="iconbtn" aria-label={t('Pick an icon')} onClick={() => glyphPicker(r.emoji, g => update(s => { s.routines.find(x => x.id === id).emoji = g }))}><Icon name={glyphOf(r.emoji)} /></button>
    </div>

    <div className="sect-b" style={{ marginBottom: 16 }}>
      <SelectRow icon="chartLine" title={t('Progression')} sheetTitle={t('Progression')}
        value={r.prog || 'linear'} onChange={v => update(s => { s.routines.find(x => x.id === id).prog = v })}
        options={POLICIES_FOR.reps.map(p => ({ value: p, label: t(POLICY_NAME[p]), subtitle: t(POLICY_DESC[p]) }))} />
    </div>
    <div className="small dim" style={{ margin: '-10px 2px 16px' }}>
      {t('Applies to every exercise in this routine that does not set its own rule.')}
    </div>

    {r.ex.length ? <div className="list">{r.ex.map((e, i) => {
      // An unresolvable id is shown rather than skipped — hiding it left an entry you
      // could neither see nor delete, but that still turned up in the workout.
      const ex = exOr(e.id)
      const linkedPrev = i > 0 && e.sg && r.ex[i - 1].sg === e.sg
      // drag visuals: the grabbed row follows the finger 1:1; siblings between origin
      // and hover shift one slot so the landing place is always obvious.
      let dragStyle
      if (drag) {
        if (i === drag.i) dragStyle = { transform: `translateY(${drag.dy}px)`, zIndex: 10, position: 'relative', boxShadow: '0 10px 28px rgba(0,0,0,.4)', opacity: .92, touchAction: 'none' }
        else if (drag.i < drag.over && i > drag.i && i <= drag.over) dragStyle = { transform: `translateY(-${rowStep}px)` }
        else if (drag.i > drag.over && i >= drag.over && i < drag.i) dragStyle = { transform: `translateY(${rowStep}px)` }
      }
      return <div key={i}>
        {unitFirst.has(i) && <div className="ss-label"><Icon name="link" />{t('Superset')}</div>}
        <ListItem className={'item' + (inSS.has(i) ? ' in-ss' : '')} ref={el => { rowRefs.current[i] = el }}
          style={dragStyle}
          onClick={() => {
            exConfigSheet(ex, e, cfg => edit(x => { x[i] = { id: x[i].id, sg: x[i].sg, ...cfg } }), () => edit(x => { x.splice(i, 1); cleanupSg(x) }), r)
          }}>
          <Thumb ex={ex} />
          <div className="grow"><div className="tt capitalize">{ex.n}</div><div className="ss">{exLine(e, S.unit)}</div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 'none', alignItems: 'center' }}>
            <button className="iconbtn" aria-label={t('Drag to reorder')} style={{ width: 40, height: 28, borderRadius: 8, cursor: drag?.i === i ? 'grabbing' : 'grab', touchAction: 'none' }}
              onPointerDown={ev => onDragStart(ev, i)}
              onPointerMove={ev => drag && drag.i === i && onDragMove(ev)}
              onPointerUp={onDragEnd} onPointerCancel={onDragEnd}>
              <Icon name="list" />
            </button>
            {i > 0 && <button className={'iconbtn' + (linkedPrev ? ' on-ss' : '')} title={t('Superset with exercise above')} aria-label={t('Superset with exercise above')} style={{ width: 40, height: 32, borderRadius: 8, fontSize: 15 }} onClick={ev => { ev.stopPropagation(); toggleLink(i) }}><Icon name="link" /></button>}
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="iconbtn" aria-label={t('Move up')} style={{ width: 40, height: 30, borderRadius: 7, fontSize: 14 }} onClick={ev => { ev.stopPropagation(); move(i, -1) }}><Icon name="chevronUp" /></button>
              <button className="iconbtn" aria-label={t('Move down')} style={{ width: 40, height: 30, borderRadius: 7, fontSize: 14 }} onClick={ev => { ev.stopPropagation(); move(i, 1) }}><Icon name="chevronDown" /></button>
            </div>
          </div>
        </ListItem>
      </div>
    })}</div> : <div className="empty"><div className="ico"><Icon name="dumbbell" /></div>{t('No exercises yet — add your first one.')}</div>}

    {/* Coverage of the routine as planned, so a gap shows up while you're building it
        rather than after a month of training around it. */}
    {r.ex.length > 0 && (() => {
      const load = loadOfRoutine(r)
      const { worked } = rankOf(load)
      return <div className="card" style={{ marginTop: 12 }}>
        <h2>{t('What this session hits')}</h2>
        <BodyMap load={load} body={S.body} />
        <div className="mchips">
          {worked.slice(0, 6).map(m => <span key={m} className="mchip">{t(MUSCLE_NAME[m])}</span>)}
        </div>
      </div>
    })()}

    <div className="small dim row" style={{ margin: '10px 2px', gap: 5 }}><Icon name="link" style={{ fontSize: 13 }} />{t('Tap the link button on an exercise to superset it with the one above — you’ll do them back-to-back.')}</div>
    <Button variant="primary" onClick={() => exercisePicker(ex => exConfigSheet(ex, null, cfg => edit(x => { x.push({ id: ex.id, ...cfg }) }), null, r))} icon="plus">{t('Add exercise')}</Button>
    <div style={{ height: 10 }} />
    <Button variant="danger" onClick={() => confirmSheet({
      title: t('Delete routine?'), message: t('“{0}” and its exercises will be removed.', r.name), confirmText: t('Delete'), danger: true,
      onConfirm: () => {
        update(s => {
          s.routines = s.routines.filter(x => x.id !== id)
          Object.keys(s.week).forEach(k => { if (s.week[k] === id) delete s.week[k] })
          Object.keys(s.dayPlan).forEach(k => { if (s.dayPlan[k] === id) delete s.dayPlan[k] })
        })
        nav('/plan')
      }
    })}>{t('Delete routine')}</Button>
  </div>
}
