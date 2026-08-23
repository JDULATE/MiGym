// Spotlight walkthrough controller (docs/TUTORIAL.md).
// Renders OVER the real app: a dimmed overlay with a rounded cut-out around the live
// target element and a Giwi tooltip. Missing/invisible targets degrade to a centred
// card instead of failing — the tour always completes.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Giwi from '../Giwi.jsx'
import { TUTORIAL_STEPS, copyFor } from './steps.js'
import { setTutorial } from '../flags.js'
import { t } from '../../lib/i18n.js'

export default function GiwiTutorial({ onDone }) {
  const nav = useNavigate()
  const [idx, setIdx] = useState(() => {
    const saved = localStorage.getItem('migym_tutorial_v1')
    try {
      const cur = JSON.parse(saved || '{}').currentStep
      const i = TUTORIAL_STEPS.findIndex(s => s.id === cur)
      return i >= 0 ? i : 0
    } catch { return 0 }
  })
  const [rect, setRect] = useState(null)
  const step = TUTORIAL_STEPS[idx]

  // navigate to the screen that owns this step, then measure its target
  useEffect(() => {
    setTutorial({ currentStep: step.id })
    if (step.route) nav(step.route)
    let raf2, alive = true
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const el = document.querySelector(`[data-giwi="${step.target}"]`)
        if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' in document ? 'auto' : 'auto' })
        if (!alive) return
        measure(el)
      })
    })
    const onReflow = () => { const el = document.querySelector(`[data-giwi="${step.target}"]`); measure(el) }
    window.addEventListener('resize', onReflow)
    window.addEventListener('scroll', onReflow, true)
    function measure(el) {
      if (!el) { setRect(null); return }
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2)
      window.removeEventListener('resize', onReflow); window.removeEventListener('scroll', onReflow, true) }
  }, [idx])

  const finish = skipped => {
    setTutorial({ completed: true, skipped: !!skipped, currentStep: null })
    onDone?.()
  }

  const copy = copyFor(step.id)
  const pad = 10
  const hasTarget = !!rect && rect.width > 0

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300 }}>
      {/* spotlight cut-out (only when the target is actually on screen) */}
      {rect && <div style={{ position: 'fixed', top: rect.top - pad, left: rect.left - pad,
        width: rect.width + pad * 2, height: rect.height + pad * 2, borderRadius: 14,
        boxShadow: '0 0 0 9999px rgba(0,0,0,.65)', pointerEvents: 'none',
        border: '2px solid var(--acc)', transition: 'all .25s ease' }} />}
      {!hasTarget && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)' }} />}

      {/* click shield: the tour is modal; real interaction resumes after it */}
      <div style={{ position: 'fixed', inset: 0 }} onClick={e => e.stopPropagation()} />

      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)',
        bottom: hasTarget ? undefined : Math.max(24, window.innerHeight / 2 - 140),
        ...(hasTarget && rect && rect.top > window.innerHeight / 2
          ? { top: 24 } : hasTarget ? { bottom: 24 } : {}),
        width: 'min(420px, calc(100vw - 32px))' }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Giwi state="point" size={72} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="t-title" style={{ marginBottom: 4 }}>{t(copy.title)}</div>
              <div className="muted small">{t(copy.body)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <span className="dim small">{idx + 1} / {TUTORIAL_STEPS.length}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn ghost dim" onClick={() => finish(true)}>{t(DIALOGUE_SKIP)}</button>
              <button className="btn primary" onClick={() => {
                if (idx >= TUTORIAL_STEPS.length - 1) finish(false)
                else setIdx(i => i + 1)
              }}>{idx >= TUTORIAL_STEPS.length - 1 ? t(DIALOGUE_DONE) : t('Continue')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const DIALOGUE_SKIP = 'Skip'
const DIALOGUE_DONE = 'Done'
