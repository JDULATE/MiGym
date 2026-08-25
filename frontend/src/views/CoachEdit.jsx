// Coach profile editor (ADR-0008) — any signed-in user can apply; an admin approves.
// The avatar is downscaled on a canvas before upload (ADR-0003: no new deps, no third-party
// storage) — the server only ever sees a small JPEG data URL.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import Icon from '../components/Icon.jsx'
import { Button, TextField, TextArea } from '../components/ui.jsx'
import './coaches.css'

const LANGS = ['es', 'en', 'pt', 'fr', 'de', 'it']
const MODALITIES = [
  { v: 'online', label: 'Online' },
  { v: 'inperson', label: 'In person' },
  { v: 'both', label: 'Online + in person' },
]
const COUNTRIES = ['Costa Rica', 'Nicaragua', 'Panamá', 'México', 'Colombia', 'Venezuela', 'Ecuador', 'Perú',
  'Chile', 'Argentina', 'Uruguay', 'Paraguay', 'Bolivia', 'Guatemala', 'Honduras', 'El Salvador',
  'Cuba', 'República Dominicana', 'España', 'Estados Unidos', 'Canadá', 'Brasil', 'Portugal', 'Otro']
const CR_PROVINCES = ['San José', 'Alajuela', 'Cartago', 'Heredia', 'Guanacaste', 'Puntarenas', 'Limón']
const EMPTY = {
  bio: '', certs: '', tags: [], langs: [], modality: 'both', rate: '',
  country: '', province: '', place: '',
  contact: { wa: '', ig: '', email: '', web: '' },
}
const STATUS_STYLE = {
  pending: { bg: 'rgba(245,166,35,.15)', fg: '#e0a52e' },
  approved: { bg: 'rgba(80,200,120,.16)', fg: '#4fae70' },
  rejected: { bg: 'rgba(220,80,80,.14)', fg: '#d95f5f' },
  hidden: { bg: 'rgba(150,150,160,.18)', fg: '#9a9aa6' },
}

// Canvas downscale with center-crop to 256×256 JPEG. Retries at lower quality once if the
// result still exceeds the server's 250 KB cap (huge source photos).
function fileToAvatar(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      try {
        const S = 256
        const cv = document.createElement('canvas')
        cv.width = S; cv.height = S
        const ctx = cv.getContext('2d')
        const side = Math.min(img.width, img.height)
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, S, S)
        URL.revokeObjectURL(url)
        let out = cv.toDataURL('image/jpeg', 0.85)
        if (out.length > 330000) out = cv.toDataURL('image/jpeg', 0.6)   // ~250 KB base64 ceiling
        resolve(out)
      } catch (e) { URL.revokeObjectURL(url); reject(e) }
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')) }
    img.src = url
  })
}

export default function CoachEdit({ embedded = false }) {
  const nav = useNavigate()
  const user = useStore(s => s.user)
  const toast = useUI(s => s.toast)
  const fileRef = useRef(null)
  const [f, setF] = useState(EMPTY)
  const [status, setStatus] = useState(null)
  const [avatarV, setAvatarV] = useState(0)
  const [tagInput, setTagInput] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api('/api/marketplace/myprofile')
      .then(d => {
        if (!d.profile) return
        const p = d.profile
        setF({
          bio: p.bio || '', certs: p.certs || '', tags: p.tags || [], langs: p.langs || [],
          modality: p.modality || 'both', rate: p.rate || '',
          country: p.country || '', province: p.province || '', place: p.place || '',
          contact: Object.assign({ wa: '', ig: '', email: '', web: '' }, p.contact),
        })
        setStatus(p.status || null)
        setAvatarV(p.avatarV || 0)
      })
      .catch(e => toast(e.message))
  }, [])

  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const setC = (k, v) => setF(x => ({ ...x, contact: { ...x.contact, [k]: v } }))

  const addTag = () => {
    const v = tagInput.trim().slice(0, 24)
    if (!v || f.tags.includes(v) || f.tags.length >= 8) return
    set('tags', [...f.tags, v])
    setTagInput('')
  }

  const save = async () => {
    setBusy(true)
    try {
      const r = await api('/api/marketplace/profile', { method: 'PUT', body: JSON.stringify(f) })
      setStatus(r.status)
      toast(t('Sent for review — an admin will approve your listing.'))
    } catch (e) { toast(e.message) }
    setBusy(false)
  }

  const pickPhoto = async e => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const data = await fileToAvatar(file)
      const r = await api('/api/marketplace/avatar', { method: 'PUT', body: JSON.stringify({ data }) })
      setAvatarV(r.avatarV || avatarV + 1)
      toast(t('Photo updated'))
    } catch (err) { toast(err.message) }
    setBusy(false)
  }

  const removePhoto = async () => {
    setBusy(true)
    try {
      await api('/api/marketplace/avatar', { method: 'DELETE' })
      setAvatarV(v => v + 1)
    } catch (e) { toast(e.message) }
    setBusy(false)
  }

  const st = STATUS_STYLE[status]

  return (
    <div className="narrow" style={{ padding: '14px 16px 60px' }}>
      {!embedded && <div className="row between" style={{ marginBottom: 4 }}>
        <h2 style={{ margin: 0 }}>{t('Coach profile')}</h2>
        <button onClick={() => nav('/coaches')} className="muted small" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          {t('View directory')} ↗
        </button>
      </div>}
      <div className="muted small" style={{ marginBottom: 14 }}>{t('Students will see this in the public directory and will contact you outside the app.')}</div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14 }}>
        {avatarV ? (
          <img key={avatarV} className="mkt-avatar" style={{ width: 64, height: 64 }} alt=""
            src={`/api/marketplace/avatar?uid=${encodeURIComponent(user?.id || '')}&v=${avatarV}`}
            onError={e => { e.currentTarget.style.display = 'none' }} />
        ) : (
          <div className="mkt-avatar-fb" style={{ width: 64, height: 64, background: 'var(--acc-soft)', color: 'var(--acc)' }}>
            <Icon name="personCircle" size={30} />
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Button size="small" icon="pencil" onClick={() => fileRef.current?.click()}>{t('Add photo')}</Button>
          {!!avatarV && <Button size="small" icon="trash" onClick={removePhoto}>{t('Remove photo')}</Button>}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickPhoto} />
        </div>
      </div>

      {st && (
        <div style={{ marginTop: 12 }}>
          <span style={{ background: st.bg, color: st.fg, borderRadius: 999, padding: '5px 12px', fontSize: '.78rem', fontWeight: 650 }}>
            {t(status === 'pending' ? 'Pending review' : status === 'approved' ? 'Approved — live in the directory' : status === 'rejected' ? 'Rejected' : 'Hidden')}
          </span>
        </div>
      )}

      <h4 className="sec">{t('Modality')}</h4>
      <div style={{ display: 'flex', gap: 6 }}>
        {MODALITIES.map(m => (
          <button key={m.v} onClick={() => set('modality', m.v)}
            className={'tag' + (f.modality === m.v ? ' acc' : '')}
            style={{ border: 'none', cursor: 'pointer', padding: '7px 12px' }}>{t(m.label)}</button>
        ))}
      </div>

      <h4 className="sec">{t('Languages')}</h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {LANGS.map(l => {
          const on = f.langs.includes(l)
          return (
            <button key={l} onClick={() => set('langs', on ? f.langs.filter(x => x !== l) : [...f.langs, l].slice(0, 6))}
              className={'tag' + (on ? ' acc' : '')}
              style={{ border: 'none', cursor: 'pointer', padding: '7px 12px' }}>{l.toUpperCase()}</button>
          )
        })}
      </div>

      <h4 className="sec">{t('Specialties')}</h4>
      <div style={{ display: 'flex', gap: 6 }}>
        <TextField value={tagInput} onChange={e => setTagInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
          placeholder={t('e.g. powerlifting')} style={{ flex: 1 }} />
        <Button onClick={addTag} icon="plus" aria-label={t('Add')}>{t('Add')}</Button>
      </div>
      {!!f.tags.length && (
        <div className="mkt-chips" style={{ marginTop: 8 }}>
          {f.tags.map(x => (
            <span key={x} className="tag acc" style={{ cursor: 'pointer' }}
              onClick={() => set('tags', f.tags.filter(y => y !== x))}>{x} ✕</span>
          ))}
        </div>
      )}

      <h4 className="sec">{t('Certifications')}</h4>
      <TextField value={f.certs} onChange={e => set('certs', e.target.value)} placeholder={t('NSCA-CSCS, ISSA…')} />

      <h4 className="sec">{t('Bio')}</h4>
      <TextArea value={f.bio} onChange={e => set('bio', e.target.value)} rows={4}
        placeholder={t('Tell students who you help and how.')} maxLength={500} style={{ width: '100%' }} />

      <h4 className="sec">{t('Rate (optional)')}</h4>
      <TextField value={f.rate} onChange={e => set('rate', e.target.value)} placeholder="$30/session" />

      <h4 className="sec">{t('Location')}</h4>
      <div className="list">
        <select className="field" value={f.country} onChange={e => { set('country', e.target.value); if (e.target.value !== 'Costa Rica') set('province', '') }}>
          <option value="">{t('Select country')}</option>
          {COUNTRIES.map(cName => <option key={cName} value={cName}>{cName}</option>)}
        </select>
        {f.country === 'Costa Rica' ? (
          <select className="field" value={f.province} onChange={e => set('province', e.target.value)}>
            <option value="">{t('Select province')}</option>
            {CR_PROVINCES.map(pr => <option key={pr} value={pr}>{pr}</option>)}
          </select>
        ) : (
          <TextField value={f.province} onChange={e => set('province', e.target.value)} placeholder={t('Province / state')} />
        )}
        <TextField value={f.place} onChange={e => set('place', e.target.value)} placeholder={t('Gym / training place (e.g. Gold\u2019s Gym La Sabana)')} />
      </div>

      <h4 className="sec">{t('Contact (shown publicly)')}</h4>
      <div className="list">
        <TextField value={f.contact.wa} onChange={e => setC('wa', e.target.value)} placeholder={t('WhatsApp number')} inputMode="tel" />
        <TextField value={f.contact.ig} onChange={e => setC('ig', e.target.value)} placeholder={t('Instagram username')} />
        <TextField value={f.contact.email} onChange={e => setC('email', e.target.value)} placeholder={t('Email')} inputMode="email" />
        <TextField value={f.contact.web} onChange={e => setC('web', e.target.value)} placeholder={t('Website URL')} inputMode="url" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <Button variant="primary" disabled={busy} onClick={save}>{busy ? '…' : t('Save profile')}</Button>
      </div>
    </div>
  )
}
