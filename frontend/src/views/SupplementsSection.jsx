// Supplements settings section (local-first). List + add/edit/delete; reminder
// permission lives here too. All mutations via lib/supplements.js helpers.
import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { DAYN } from '../lib/format.js'
import Icon from '../components/Icon.jsx'
import { Section, Row, Button, TextField, SelectRow } from '../components/ui.jsx'
import { items as suppItems, SUPP_KINDS, SUPP_PRESETS, patchItem, addItem, removeItem } from '../lib/supplements.js'

const KIND_OPTS = SUPP_KINDS.map(k => ({ value: k.v, label: t(k.label) }))
const SCHED_OPTS = [
  { value: 'daily', label: 'Daily' },
  { value: 'training', label: 'Training days' },
  { value: 'rest', label: 'Rest days' },
  { value: 'days', label: 'Custom days' },
]
const kindLabel = v => t((SUPP_KINDS.find(k => k.v === v) || { label: v }).label)
const schedLabel = v => t((SCHED_OPTS.find(o => o.value === (v || 'daily')) || {}).label || 'Daily')

function SuppEditSheet({ close, item, initial }) {
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

export default function SupplementsSection() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const openSheet = useUI(s => s.openSheet)
  const all = suppItems(S)

  const addNew = preset => openSheet(close =>
    // no `item` → treated as NEW: Save runs addItem (the id-less path)
    <SuppEditSheet close={close} item={null} initial={preset ? { ...preset, name: kindLabel(pr0Kind(preset)) } : null} />)

  const pr0Kind = preset => preset?.kind || 'other'

  const askNotify = async () => {
    try { await Notification.requestPermission(); useUI.getState().toast(t('Reminders enabled')) } catch { /* denied */ }
  }

  return (
    <Section title={t('Supplements')}
      footer={t('Daily checklist on Home. Pre-workout asks before a session; protein after it.')}>
      {all.map(it => (
        <Row key={it.id}
          icon={(SUPP_KINDS.find(k => k.v === it.kind) || {}).icon || 'heart'}
          iconTint="var(--acc)"
          title={it.name || kindLabel(it.kind)}
          subtitle={[it.dose, schedLabel(it.sched)].filter(Boolean).join(' · ')}
          accessory="chevron"
          onClick={() => openSheet(close => <SuppEditSheet close={close} item={it} />)} />
      ))}
      {'Notification' in window && Notification.permission === 'default' && (
        <Row icon="bell" iconTint="var(--yellow)" title={t('Enable reminders')}
          subtitle={t('Browser notification when a dose is due')}
          accessory="chevron" onClick={askNotify} />
      )}
      <Row icon="plus" iconTint="var(--acc)" title={t('Add supplement')}
        onClick={() => openSheet(close => (
          <div>
            <h3>{t('Add supplement')}</h3>
            <div className="list">
              {SUPP_PRESETS.map((pr, i) => (
                <div key={i} className="item" onClick={() => { close(); addNew(pr) }}>
                  <div className="grow">
                    <div className="tt">{kindLabel(pr.kind)}</div>
                    <div className="ss">{pr.dose}</div>
                  </div>
                  <Icon name="chevronRight" className="chev" />
                </div>
              ))}
              <div className="item" onClick={() => { close(); addNew(null) }}>
                <div className="grow"><div className="tt">{t('Custom…')}</div></div>
                <Icon name="chevronRight" className="chev" />
              </div>
            </div>
          </div>))} />
    </Section>
  )
}
