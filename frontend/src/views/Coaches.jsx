// Coach marketplace directory (ADR-0008) — the one fully public page in the app.
// No login, no onboarding gate: App.jsx short-circuits straight here for /coaches.
// Contact happens OFF-platform by design — these are plain outbound links.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { SearchField, Button } from '../components/ui.jsx'
import './coaches.css'

const MODALITIES = ['any', 'online', 'inperson']
const initialsOf = n => (n || '?').split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
const hueOf = s => { let h = 7; for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) % 360; return h }
const waLink = num => 'https://wa.me/' + String(num || '').replace(/[^\d]/g, '')
const igLink = h => 'https://instagram.com/' + encodeURIComponent(String(h || '').replace(/^@/, ''))
const LANGS = ['es', 'en', 'pt', 'fr', 'de', 'it']

function Avatar({ p }) {
  const [broken, setBroken] = useState(false)
  if (!p.avatarV || broken) {
    return <div className="mkt-avatar-fb" style={{ background: `hsl(${hueOf(p.uid)} 45% 38%)` }}>{initialsOf(p.name)}</div>
  }
  return <img className="mkt-avatar" alt="" src={`/api/marketplace/avatar?uid=${encodeURIComponent(p.uid)}&v=${p.avatarV}`} onError={() => setBroken(true)} />
}

function modalityLabel(m) {
  if (m === 'online') return t('Online')
  if (m === 'inperson') return t('In person')
  return t('Online + in person')
}

function CoachCard({ p }) {
  const c = p.contact || {}
  const links = []
  if (c.wa) links.push({ label: 'WhatsApp', href: waLink(c.wa) })
  if (c.ig) links.push({ label: 'Instagram', href: igLink(c.ig) })
  if (c.email) links.push({ label: t('Email'), href: 'mailto:' + c.email })
  if (c.web) links.push({ label: t('Website'), href: c.web })
  return (
    <div className="mkt-card">
      <div className="mkt-head">
        <Avatar p={p} />
        <div style={{ minWidth: 0 }}>
          <div className="mkt-name">{p.name}</div>
          <div className="muted small">{modalityLabel(p.modality)}{p.rate ? ' · ' + p.rate : ''}</div>
        </div>
      </div>
      {p.bio && <div className="mkt-bio">{p.bio}</div>}
      {!!(p.tags || []).length && (
        <div className="mkt-chips">{p.tags.map(x => <span key={x} className="tag acc">{x}</span>)}</div>
      )}
      {p.certs && <div className="dim small">{t('Certifications')}: {p.certs}</div>}
      {!!(p.langs || []).length && (
        <div className="mkt-chips">{p.langs.map(l => <span key={l} className="tag">{String(l).toUpperCase()}</span>)}</div>
      )}
      {!!links.length && (
        <div className="mkt-links">
          {links.map(l => <a key={l.label} href={l.href} target="_blank" rel="noopener nofollow">{l.label} ↗</a>)}
        </div>
      )}
    </div>
  )
}

export default function Coaches() {
  const nav = useNavigate()
  const user = useStore(s => s.user)
  const [list, setList] = useState(null)
  const [q, setQ] = useState('')
  const [mod, setMod] = useState('any')

  useEffect(() => {
    fetch('/api/marketplace/coaches').then(r => r.json()).then(d => setList(d.coaches || [])).catch(() => setList([]))
  }, [])

  const shown = useMemo(() => {
    if (!list) return null
    const needle = q.trim().toLowerCase()
    return list.filter(p => {
      if (mod !== 'any' && p.modality !== 'both' && p.modality !== mod) return false
      if (!needle) return true
      const hay = [p.name, p.bio, p.certs, p.rate, ...(p.tags || []), ...(p.langs || [])].join(' ').toLowerCase()
      return hay.includes(needle)
    })
  }, [list, q, mod])

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="mkt-top">
        <button aria-label="MiGym" onClick={() => nav('/home')}
          style={{ background: 'none', border: 'none', color: 'var(--acc)', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <Icon name="dumbbell" size={22} />
        </button>
        <div style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-.01em', flex: 1 }}>{t('Find a coach')}</div>
        <Button size="small" icon="person" onClick={() => nav(user ? '/coach' : '/home')}>
          {user ? t('My coach profile') : t('Open MiGym')}
        </Button>
      </div>

      <div className="narrow" style={{ padding: '14px 16px 40px' }}>
        <div className="muted small" style={{ marginBottom: 12 }}>{t('Browse coach profiles and reach out directly — training happens outside the app.')}</div>
        <SearchField value={q} onChange={setQ} onClear={() => setQ('')} placeholder={t('Search coaches')} />
        <div style={{ display: 'flex', gap: 6, margin: '10px 0 16px' }}>
          {MODALITIES.map(m => (
            <button key={m} onClick={() => setMod(m)}
              className={'tag' + (mod === m ? ' acc' : '')}
              style={{ border: 'none', cursor: 'pointer', padding: '6px 12px' }}>
              {m === 'any' ? t('Any modality') : m === 'online' ? t('Online') : t('In person')}
            </button>
          ))}
        </div>

        {shown === null && <div className="muted small">…</div>}
        {shown && !shown.length && (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div className="muted" style={{ marginBottom: 16 }}>{t('No coaches listed yet — be the first.')}</div>
            <Button variant="primary" onClick={() => nav(user ? '/coach' : '/home')}>{t('Become a coach')}</Button>
          </div>
        )}
        {shown && !!shown.length && (
          <>
            <div className="mkt-grid">
              {shown.map(p => <CoachCard key={p.uid} p={p} />)}
            </div>
            <div style={{ textAlign: 'center', marginTop: 28 }}>
              <Button variant="primary" onClick={() => nav(user ? '/coach' : '/home')}>{t('Become a coach')}</Button>
              {!user && <div className="dim small" style={{ marginTop: 8 }}>{t('Sign in from the app first — then publish your profile from here.')}</div>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
