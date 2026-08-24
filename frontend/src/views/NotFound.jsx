// 404 — page not found, with Giwi looking confused.
import { useNavigate } from 'react-router-dom'
import Giwi from '../giwi/Giwi.jsx'
import { t } from '../lib/i18n.js'
import { Button } from '../components/ui.jsx'

export default function NotFound() {
  const nav = useNavigate()
  return (
    <div className="narrow" style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 20 }}>
      <Giwi state="surprissed" size={140} />
      <h1 style={{ fontSize: 64, fontWeight: 700, letterSpacing: '-.03em', margin: '16px 0 4px', color: 'var(--acc)' }}>404</h1>
      <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{t('Page not found')}</div>
      <div className="muted small" style={{ marginBottom: 24, maxWidth: 300 }}>
        {t('Giwi looked everywhere but couldn\u2019t find that page. It might have been moved or doesn\u2019t exist.')}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="primary" icon="house" onClick={() => nav('/home')}>{t('Go home')}</Button>
        <Button icon="dumbbell" onClick={() => nav('/workout')}>{t('Start workout')}</Button>
      </div>
    </div>
  )
}
