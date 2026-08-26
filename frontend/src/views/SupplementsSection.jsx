// Supplement sheets — edit form + add-chooser, reusable from Home (and anywhere).
// Mutations go through lib/supplements.js helpers (store persist/sync path).
import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { DAYN } from '../lib/format.js'
import Icon from '../components/Icon.jsx'
import { Button, TextField, SelectRow } from '../components/ui.jsx'
import { SUPP_KINDS, SUPP_PRESETS, patchItem, addItem, removeItem } from '../lib/supplements.js'

const KIND_OPTS = SUPP_KINDS.map(k => ({ value: k.v, label: t(k.label) }))
const SCHED_OPTS = [
  { value: 'daily', label: 'Daily' },
  { value: 'training', label: 'Training days' },
  { value: 'rest', label: 'Rest days' },
  { value: 'days', label: 'Custom days' },
]
export const kindLabel = v => t((SUPP_KINDS.find(k => k.v === v) || { label: v }).label)
export const schedLabel = v => t((SCHED_OPTS.find(o => o.value === (v || 'daily')) || {}).label || 'Daily')

/* Edit an existing item (`item`) or create a new one (item=null, values from `initial`). */
export function SuppEditSheet({ close, item, initial }) {
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)
  const [f, setF] = useState(() => item || {
    id: null, name: '', kind: 'creatine', dose: '', sched: 'daily', days: [], time: '',
    ...(initial || {}),
  })
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const save = () => {
    if (!f.name.trim()) { toast(t('Give it a name')); return }
    if (f.id) patchItem(update, f.id, f)
    else addItem(update, f)
    toast(t('Saved'))
    close()
  }
  return <>
    <h3>{item ? t('Edit supplement') : t('Add supplement')}</h3>
    <TextField value={f.name} onChange={e => set('name', e.target.value)} placeholder={t('Name (e.g. Creatine)')} />
    <div style={{ height: 8 }} />
    <SelectRow title={t('Kind')} value={f.kind} options={KIND_OPTS} onChange={v => set('kind', v)} />
    <div style={{ height: 8 }} />
    <TextField value={f.dose} onChange={e => set('dose', e.target.value)} placeholder={t('Dose (e.g. 5 g)')} />
    <div style={{ height: 8 }} />
    <SelectRow title={t('Schedule')} value={f.sched} options={SCHED_OPTS.map(o => ({ ...o, label: t(o.label) }))} onChange={v => set('sched', v)} />
    {f.sched === 'days' && (
      <div className="row" style={{ gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
        {[1, 2, 3, 4, 5, 6, 0].map(dd => {
          const on = (f.days || []).includes(dd)
          return (
            <button key={dd} className={'tag' + (on ? ' acc' : '')}
              style={{ border: 'none', cursor: 'pointer', padding: '6px 10px' }}
              onClick={() => set('days', on ? f.days.filter(x => x !== dd) : [...f.days, dd])}>
              {t(DAYN[dd]).slice(0, 2)}
            </button>
          )
        })}
      </div>
    )}
    <div style={{ height: 8 }} />
    <TextField type="time" value={f.time} onChange={e => set('time', e.target.value)}
      placeholder={t('Reminder time (optional)')} />
    <div style={{ height: 12 }} />
    <Button variant="primary" icon="check" onClick={save}>{t('Save')}</Button>
    <div style={{ height: 8 }} />
    {item && (
      <Button variant="danger" icon="trash"
        onClick={() => { removeItem(update, item.id); close() }}>
        {t('Delete')}
      </Button>
    )}
  </>
}

/* Preset chooser shown by the Home card's add button. */
export function SuppAddChooser({ close }) {
  return (
    <div>
      <h3>{t('Add supplement')}</h3>
      <div className="list">
        {SUPP_PRESETS.map((pr, i) => (
          <div key={i} className="item"
            onClick={() => {
              close()
              // open the editor prefilled; Save creates it (id-less path)
              useUI.getState().openSheet(cl =>
                <SuppEditSheet close={cl} item={null}
                  initial={{ ...pr, name: kindLabel(pr.kind) }} />)
            }}>
              <div className="grow">
                <div className="tt">{kindLabel(pr.kind)}</div>
                <div className="ss">{pr.dose}</div>
              </div>
              <Icon name="chevronRight" className="chev" />
            </div>
        ))}
        <div className="item" onClick={() => {
          close()
          useUI.getState().openSheet(cl => <SuppEditSheet close={cl} item={null} />)
        }}>
          <div className="grow"><div className="tt">{t('Custom…')}</div></div>
          <Icon name="chevronRight" className="chev" />
        </div>
      </div>
    </div>
  )
}

/* Full manager list (edit/delete existing + add). */
export function SuppManageList() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const all = suppItemsSafe(S)
  return (
    <div>
      <h3>{t('Supplements')}</h3>
      <div className="list">
        {all.map(it => (
          <div key={it.id} className="item"
            onClick={() => useUI.getState().openSheet(cl => <SuppEditSheet close={cl} item={it} />)}>
            <div className="grow">
              <div className="tt capitalize">{it.name || kindLabel(it.kind)}</div>
              <div className="ss">{[it.dose, schedLabel(it.sched)].filter(Boolean).join(' · ')}</div>
            </div>
            <Icon name="chevronRight" className="chev" />
          </div>
        ))}
        {!all.length && <div className="muted small">{t('No supplements yet — add one below.')}</div>}
      </div>
      <div style={{ height: 10 }} />
      <Button icon="plus" onClick={() => useUI.getState().openSheet(cl => <SuppAddChooser close={cl} />)}>
        {t('Add supplement')}
      </Button>
    </div>
  )
}
function suppItemsSafe(S) { return (S.supps && Array.isArray(S.supps.items)) ? S.supps.items : [] }
