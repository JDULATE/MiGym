// Coach-side client roster (ADR-0007 UI) — extracted from Settings so the coach hub
// and Settings can share it without duplication (UI-UX Round 3, R3-3).
import { useEffect, useState } from 'react'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { fmtVol } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { Section, Row, Button } from '../components/ui.jsx'

export default function ClientsSection() {
  const toast = useUI(s => s.toast)
  const [clients, setClients] = useState(null)
  const load = () => api('/api/coach/clients').then(r => setClients(r.clients || [])).catch(() => setClients([]))
  useEffect(() => { load() }, [])
  const openClient = clientId => useUI.getState().openSheet(close => <ClientSheet close={close} clientId={clientId} onNote={load} />)
  return <Section title={t('Clients')} footer={t('You see what each client consented to — nothing more.')}>
    {clients === null ? <div className="muted small">{t('Loading…')}</div>
      : clients.length === 0 ? <div className="muted small">{t('No clients yet — redeem a pairing code from a client.')}</div>
      : clients.map(c => <Row key={c.clientId} icon="personCircle" iconTint="var(--teal)"
          title={c.name}
          subtitle={c.lastSession ? t('Last session: {0}', c.lastSession.d) : undefined}
          value={t('30-day sessions') + ': ' + c.last30} accessory="chevron"
          onClick={() => openClient(c.clientId)} />)}
  </Section>
}

function ClientSheet({ close, clientId }) {
  const toast = useUI(s => s.toast)
  const [data, setData] = useState(null)
  const [note, setNote] = useState('')
  const load = () => api('/api/coach/client?id=' + encodeURIComponent(clientId)).then(setData).catch(e => toast(e.message))
  useEffect(() => { load() }, [])
  const saveNote = async () => {
    const text = note.trim(); if (!text) return
    try {
      await api('/api/coach/note', { method: 'POST', body: JSON.stringify({ clientId, text }) })
      setNote(''); toast(t('Note saved')); load()
    } catch (e) { toast(e.message) }
  }
  if (!data) return <>
    <h3>{t('Clients')}</h3><div className="muted small">{t('Loading…')}</div>
  </>
  const c = data.client
  return <>
    <h3 className="capitalize">{c.name}</h3>
    <div className="tiles" style={{ marginBottom: 8 }}>
      <div className="tile"><div className="l"><Icon name="dumbbell" />{t('Workouts')}</div><div className="v">{c.totalWorkouts}</div></div>
      <div className="tile"><div className="l"><Icon name="calendar" />{t('30-day sessions')}</div><div className="v">{c.last30}</div></div>
      <div className="tile"><div className="l"><Icon name="chartLine" />{t('Volume · 7 days')}</div>
        <div className="v" style={{ fontSize: 18 }}>{fmtVol(c.volume30)}</div></div>
    </div>
    <div className="dim small" style={{ marginBottom: 8 }}>{c.lastSession ? t('Last session: {0}', c.lastSession.d + ' · ' + c.lastSession.name) : t('No sessions logged yet.')}</div>
    {data.scope === 'full' && <>
      <h4 className="sec">{t('Recent workouts')}</h4>
      {(data.workouts || []).map(w => (
        <div key={w.d + w.name} className="card small" style={{ marginBottom: 6 }}>
          <b>{w.name}</b> <span className="dim">{w.d}{w.durationMin != null ? ` · ${w.durationMin} min` : ''}</span>
          {(w.entries || []).map(e => <div key={e.exercise} className="dim small capitalize">{e.exercise}: {e.sets.join(', ') || '—'}</div>)}
        </div>
      ))}
    </>}
    {data.scope !== 'full' && <div className="muted small">{t('This client shares a summary only.')}</div>}
    <h4 className="sec">{t('Coach notes')}</h4>
    {(data.notes || []).map((n, i) => <div key={i} className="small dim">📝 {n.text}</div>)}
    <textarea className="input" rows={2} maxLength={1000} value={note} onChange={e => setNote(e.target.value)}
      placeholder={t('Add a note (visible to the client)')} style={{ marginTop: 8 }} />
    <div style={{ height: 10 }} />
    <Button variant="primary" onClick={saveNote}>{t('Save')}</Button>
    <div style={{ height: 8 }} />
  </>
}
