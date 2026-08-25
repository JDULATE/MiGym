// Coach marketplace hub (ADR-0008 / UI-UX Round 3).
// Two shells, one component tree:
//   • anonymous visitor → standalone public page (hero + directory), no tab bar
//   • signed-in user    → in-app hub: Directory | My profile | My clients (coaches only)
// Contact happens OFF-platform by design — outbound links only.
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { SearchField, Button, Segmented } from '../components/ui.jsx'
import CoachEdit from './CoachEdit.jsx'
import ClientsSection from './ClientsSection.jsx'
import './coaches.css'

const MODALITIES = ['any', 'online', 'inperson']
const initialsOf = n => (n || '?').split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
const hueOf = s => { let h = 7; for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) % 360; return h }
const waLink = num => 'https://wa.me/' + String(num || '').replace(/[^\d]/g, '')
const igLink = h => 'https://instagram.com/' + encodeURIComponent(String(h || '').replace(/^@/, ''))

function Avatar({ p }) {
  const [broken, setBroken] = useState(false)
  if (!p.avatarV || broken) {
    return <div className="mkt-avatar-fb" style={{ background: `linear-gradient(135deg,hsl(${hueOf(p.uid)} 50% 42%),hsl(${(hueOf(p.uid) + 40) % 360} 55% 34%))` }}>{initialsOf(p.name)}</div>
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
  if (c.ig) links.push({ label: 'IG', href: igLink(c.ig) })
  if (c.email) links.push({ label: t('Email'), href: 'mailto:' + c.email })
  if (c.web) links.push({ label: t('Website'), href: c.web })
  const where = [p.place, [p.province, p.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ')
  return (
    <div className="mkt-card">
      <div className="mkt-head">
        <Avatar p={p} />
        <div style={{ minWidth: 0 }}>
          <div className="mkt-name">{p.name}
            <span className="mkt-verified" title={t('Approved listing')}><Icon name="checkCircle" size={15} /></span>
          </div>
          <div className="muted small">{modalityLabel(p.modality)}{p.langs?.length ? ' · ' + p.langs.map(l => l.toUpperCase()).join('/') : ''}</div>
        </div>
      </div>
      {where && <div className="mkt-loc"><Icon name="pin" size={13} />{where}</div>}
      {p.bio && <div className="mkt-bio">{p.bio}</div>}
      {!!(p.tags || []).length && (
        <div className="mkt-chips">{p.tags.map(x => <span key={x} className="tag acc">{x}</span>)}</div>
      )}
      {p.certs && <div className="dim small">{t('Certifications')}: {p.certs}</div>}
      {(links.length > 0 || p.rate) && (
        <div className="mkt-foot">
          <span className="mkt-rate">{p.rate || modalityLabel(p.modality)}</span>
          <div className="mkt-links">
            {links.map(l => <a key={l.label} href={l.href} target="_blank" rel="noopener nofollow">{l.label}</a>)}
          </div>
        </div>
      )}
    </div>
  )
}

function DirectoryBody({ user, goProfile }) {
  const [list, setList] = useState(null)
  const [q, setQ] = useState('')
  const [mod, setMod] = useState('any')
  const [country, setCountry] = useState('')
  const [province, setProvince] = useState('')

  useEffect(() => {
    fetch('/api/marketplace/coaches').then(r => r.json()).then(d => setList(d.coaches || [])).catch(() => setList([]))
  }, [])

  const countries = useMemo(() => [...new Set((list || []).map(p => p.country).filter(Boolean))].sort(), [list])
  const provinces = useMemo(() =>
    [...new Set((list || []).filter(p => !country || p.country === country).map(p => p.province).filter(Boolean))].sort(),
  [list, country])

  const shown = useMemo(() => {
    if (!list) return null
    const needle = q.trim().toLowerCase()
    return list.filter(p => {
      if (country && p.country !== country) return false
      if (province && p.province !== province) return false
      if (mod !== 'any' && p.modality !== 'both' && p.modality !== mod) return false
      if (!needle) return true
      const hay = [p.name, p.bio, p.certs, p.rate, p.place, p.province, p.country, ...(p.tags || []), ...(p.langs || [])].join(' ').toLowerCase()
      return hay.includes(needle)
    })
  }, [list, q, mod, country, province])

  return (
    <>
      <SearchField value={q} onChange={setQ} onClear={() => setQ('')} placeholder={t('Search coaches')} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '10px 0 14px' }}>
        <select className="field" style={{ flex: '1 1 140px' }} value={country} onChange={e => { setCountry(e.target.value); setProvince('') }}>
          <option value="">{t('All countries')}</option>
          {countries.map(cn => <option key={cn} value={cn}>{cn}</option>)}
        </select>
        {!!provinces.length && (
          <select className="field" style={{ flex: '1 1 140px' }} value={province} onChange={e => setProvince(e.target.value)}>
            <option value="">{t('All provinces')}</option>
            {provinces.map(pr => <option key={pr} value={pr}>{pr}</option>)}
          </select>
        )}
        <div className="mkt-chiprow">
          {MODALITIES.map(m => (
            <button key={m} onClick={() => setMod(m)} className={'mkt-chip' + (mod === m ? ' on' : '')}>
              {m === 'any' ? t('Any modality') : m === 'online' ? t('Online') : t('In person')}
            </button>
          ))}
        </div>
      </div>

      {shown === null && <div className="muted small">…</div>}
      {shown && !shown.length && (
        <div style={{ textAlign: 'center', padding: '56px 20px' }}>
          <Icon name="magnifier" size={40} style={{ color: 'var(--mut,#8b8f98)' }} />
          <div className="muted" style={{ margin: '14px 0 18px' }}>{t('No coaches listed yet — be the first.')}</div>
          <Button variant="primary" onClick={goProfile}>{user ? t('Publish your profile') : t('Become a coach')}</Button>
        </div>
      )}
      {shown && !!shown.length && (
        <>
          <div className="mkt-grid">
            {shown.map(p => <CoachCard key={p.uid} p={p} />)}
          </div>
          {!user && (
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <Button variant="primary" onClick={() => useStore.getState().boot ? window.location.hash = '#/home' : null}>{t('Open MiGym')}</Button>
              <div className="dim small" style={{ marginTop: 8 }}>{t('Sign in from the app first — then publish your profile from here.')}</div>
            </div>
          )}
        </>
      )}
    </>
  )
}

function Hero({ count }) {
  return (
    <div className="mkt-hero" style={{ borderRadius: '0 0 22px 22px' }}>
      <h1>{t('Find a coach')}</h1>
      <p>{t('Browse coach profiles and reach out directly — training happens outside the app.')}</p>
      {count != null && <span className="mkt-count"><Icon name="personCircle" size={14} /> {t('{0} coaches').replace('{0}', count)}</span>}
    </div>
  )
}

export default function Coaches() {
  const user = useStore(s => s.user)

  // Anonymous shell — standalone public page (no tab bar; App.jsx routes here directly).
  if (!user) {
    return (
      <div className="mkt" style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <button aria-label="MiGym" onClick={() => { window.location.hash = '#/home' }}
            style={{ background: 'none', border: 'none', color: 'var(--acc)', cursor: 'pointer',
              padding: '14px 16px 0', display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: '.82rem', fontWeight: 700 }}>
            <Icon name="dumbbell" size={16} /> MiGym
          </button>
          <Hero />
          <div className="mkt-body"><DirectoryBody user={null} goProfile={() => { window.location.hash = '#/home' }} /></div>
        </div>
      </div>
    )
  }

  // In-app hub for signed-in users.
  return <Hub user={user} />
}

function Hub({ user }) {
  const isCoach = user?.role === 'coach'
  const loc = useLocation()
  // initial segment from ?tab= (e.g. /coach redirects to /coaches?tab=profile)
  const [tab, setTab] = useState(() => {
    const want = new URLSearchParams(loc.search).get('tab')
    return want === 'profile' || (want === 'clients' && user?.role === 'coach') ? want : 'directory'
  })
  const segs = [{ v: 'directory', label: t('Directory') }, { v: 'profile', label: t('My profile') }]
  if (isCoach) segs.push({ v: 'clients', label: t('My clients') })

  return (
    <div className="narrow" style={{ paddingBottom: 40 }}>
      <div className="hdr">
        <div style={{ flex: 1 }}><h1 style={{ margin: 0 }}>{t('Coaches')}</h1>
          <div className="sub">{t('Browse coach profiles and reach out directly — training happens outside the app.')}</div></div>
      </div>

      <Segmented options={segs} value={tab} onChange={setTab} />

      {tab === 'directory' && (
        <div style={{ marginTop: 14 }}>
          <DirectoryBody user={user} goProfile={() => setTab('profile')} />
        </div>
      )}
      {tab === 'profile' && <CoachEdit embedded />}
      {tab === 'clients' && isCoach && <ClientsSection />}
    </div>
  )
}
