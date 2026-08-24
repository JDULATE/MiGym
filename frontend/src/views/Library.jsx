import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { EXDB, BODYPARTS, allExercises, equipmentOf } from '../lib/exercises.js'
import { MOVEMENT_GROUPS, movementGroup } from '../lib/exercise-taxonomy.js'
import { bestWeightFor } from '../lib/history.js'
import { fmtNum } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { Thumb } from '../components/Media.jsx'
import { exerciseDetailSheet, addToRoutineSheet, customExSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button , ListItem} from '../components/ui.jsx'

export default function Library() {
  const S = useStore(s => s.S)
  const [q, setQ] = useState('')
  const [bp, setBp] = useState('')
  const [eq, setEq] = useState([])   // multi-select: exercises matching ANY selected equipment
  const [mg, setMg] = useState('')
  const [shown, setShown] = useState(40)
  const ql = q.toLowerCase().trim()
  const base = allExercises(S).filter(e => (!bp || e.bp === bp) && (!ql || e.n.toLowerCase().includes(ql) || e.tg.includes(ql) || e.eq.includes(ql) || (e.desc || '').toLowerCase().includes(ql)))
  // Movement group narrows like the body-part chips; exercises the taxonomy cannot place
  // (rare custom cases) only survive while no group is selected.
  const mgBase = mg ? base.filter(e => movementGroup(e) === mg) : base
  const eqOpts = equipmentOf(mgBase)
  // Multi-select: show exercises matching ANY selected equipment type.
  const f = eq.length ? mgBase.filter(e => eq.includes(e.eq)) : mgBase

  return <>
    <div className="hdr"><div><h1>{t('Exercises')}</h1><div className="sub">{t('{0} exercises with animations', EXDB.length)}</div></div></div>
    <div className="search" style={{ marginBottom: 10 }}><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      <input className="input" placeholder={t('Search…')} value={q} onChange={e => { setQ(e.target.value); setShown(40) }} /></div>
    <div className="chips chips-scroll" style={{ marginBottom: 8 }}>
      <button className={'chip nocap' + (!mg ? ' on' : '')} onClick={() => { setMg(''); setEq(''); setShown(40) }}>{t('All')}</button>
      {MOVEMENT_GROUPS.map(g => <button key={g} className={'chip nocap' + (mg === g ? ' on' : '')} onClick={() => { setMg(g); setEq(''); setShown(40) }}>{t(g)}</button>)}
    </div>
    <div className="chips chips-scroll" style={{ marginBottom: eqOpts.length > 1 ? 8 : 12 }}>
      <button className={'chip nocap' + (!bp ? ' on' : '')} onClick={() => { setBp(''); setEq(''); setShown(40) }}>{t('All')}</button>
      {BODYPARTS.map(b => <button key={b} className={'chip' + (bp === b ? ' on' : '')} onClick={() => { setBp(b); setEq(''); setShown(40) }}>{t(b)}</button>)}
    </div>
    {eqOpts.length > 1 && <div className="chips chips-scroll" style={{ marginBottom: 12 }}>
      <button className={'chip nocap' + (!eq.length ? ' on' : '')} onClick={() => { setEq([]); setShown(40) }}>{t('Any equipment')}</button>
      {eqOpts.map(x => <button key={x} className={'chip' + (eq.includes(x) ? ' on' : '')} onClick={() => {
        setEq(prev => prev.includes(x) ? prev.filter(p => p !== x) : [...prev, x]); setShown(40)
      }}>{t(x)}</button>)}
    </div>}
    <div className="card">
      <div className="list">
        <ListItem onClick={() => customExSheet(null, ex => exerciseDetailSheet(ex), q.trim())}>
          <div className="thumb thumb-x"><Icon name="sparkles" /></div>
          <div className="grow"><div className="tt">{t('Create your own exercise')}</div><div className="ss">{t('name + body part, no animation')}</div></div><Icon name="plus" className="chev" />
        </ListItem>
        {f.slice(0, shown).map(e => {
          const best = bestWeightFor(S, e.id)
          return <ListItem key={e.id} onClick={() => exerciseDetailSheet(e)}>
            <Thumb ex={e} />
            <div className="grow"><div className="tt capitalize">{e.n}</div><div className="ss capitalize">{t(e.tg || e.bp)} · {t(e.eq)}</div></div>
            {best > 0 && <span className="tag acc">{fmtNum(best)}</span>}
            <Button size="sm" variant="tinted" icon="plus" onClick={ev => { ev.stopPropagation(); addToRoutineSheet(e) }}>{t('Plan')}</Button>
          </ListItem>
        })}
      </div>
      {f.length === 0 && <div className="empty"><div className="ico"><Icon name="magnifier" /></div>{t('No match')}</div>}
    </div>
    {f.length > shown && <><div style={{ height: 10 }} /><Button onClick={() => setShown(s => s + 40)}>{t('Show more')}</Button></>}
  </>
}
