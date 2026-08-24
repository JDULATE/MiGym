// Terms of use, cookie notice and contact — rendered as a sheet from Settings.
// MiGym is local-first: no tracking cookies, no telemetry, no external services.
import { t } from '../lib/i18n.js'
import { Button } from '../components/ui.jsx'

const REPO = 'https://github.com/JDULATE'
const EMAIL = 'Ulatechandsystems@gmail.com'

export default function TermsSheet({ close }) {
  return <>
    <h3>{t('Terms & privacy')}</h3>
    <div className="small" style={{ lineHeight: 1.6 }}>
      <div style={{ fontWeight: 600, marginTop: 10, marginBottom: 4 }}>{t('Your data')}</div>
      <div className="muted">{t('MiGym stores everything on your device. Nothing is sent to external servers unless you explicitly link a server profile for sync.')}</div>

      <div style={{ fontWeight: 600, marginTop: 12, marginBottom: 4 }}>{t('Cookies & tracking')}</div>
      <div className="muted">{t('MiGym does not use tracking cookies or analytics. The only data stored is your training log, settings and preferences — all on your device.')}</div>

      <div style={{ fontWeight: 600, marginTop: 12, marginBottom: 4 }}>{t('No account required')}</div>
      <div className="muted">{t('The app works fully offline without an account. Linking a server profile is optional and only enables sync across devices.')}</div>

      <div style={{ fontWeight: 600, marginTop: 12, marginBottom: 4 }}>{t('Open source')}</div>
      <div className="muted">{t('MiGym is open source under AGPL-3.0. You can inspect, modify and self-host it freely.')}</div>

      <div style={{ fontWeight: 600, marginTop: 12, marginBottom: 4 }}>{t('No medical advice')}</div>
      <div className="muted">{t('MiGym is a training log, not a medical device. Consult a professional before starting any exercise program.')}</div>

      <div style={{ fontWeight: 600, marginTop: 12, marginBottom: 4 }}>{t('Contact')}</div>
      <div className="muted">
        <a href={REPO} target="_blank" rel="noopener" style={{ color: 'var(--acc)' }}>GitHub</a>
        {' · '}
        <a href={'mailto:' + EMAIL} style={{ color: 'var(--acc)' }}>{EMAIL}</a>
      </div>
    </div>
    <div style={{ height: 14 }} />
    <Button variant="primary" onClick={close}>{t('Done')}</Button>
    <div style={{ height: 8 }} />
  </>
}
