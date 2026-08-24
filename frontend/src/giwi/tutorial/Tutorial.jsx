// Spotlight walkthrough controller (docs/TUTORIAL.md).
// Renders OVER the real app. When the tour reaches the exercise/set/rest steps and no
// workout is active, it starts one using the first available routine — a REAL session
// the user can keep training with after the tour ends.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Giwi from '../Giwi.jsx'
import { TUTORIAL_STEPS, copyFor } from './steps.js'
import { setTutorial } from '../flags.js'
import { t } from '../../lib/i18n.js'
import { useStore } from '../../store/useStore.js'
import { buildSets, defaultConfig } from '../../lib/history.js'
import { uid } from '../../lib/format.js'

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

  // Start a real workout when the tour needs to show exercise/set/rest UI
  const ensureWorkout = () => {
    const st = useStore.getState()
    if (st.S.active) return
    const routines = st.S.routines
    const routine = routines.find(r => r.ex.length > 0)
    const ex = routine
      ? routine.ex.map(cfg => ({
          id: cfg.id, target: { ...cfg },
          sets: (cfg.sets || 3) > 0
            ? Array.from({ length: cfg.sets }, () => ({ w: cfg.weight || 0, r: cfg.reps || 10, done: false }))
            : [{ w: 0, r: 10, done: false }],
        }))
      : [
          { id: '0025', target: { sets: 3, reps: 8, weight: 60 },
            sets: [{ w: 60, r: 8, done: false }, { w: 60, r: 8, done: false }, { w: 60, r: 8, done: false }] },
        ]
    st.update(s => {
      s.active = {
        id: uid(), d: new Date().toISOString().slice(0, 10), start: Date.now(),
        routineId: routine?.id || null, name: routine?.name || 'Tutorial',
        bw: null, cur: 0, entries: ex,
      }
    })
  }

  // navigate to the screen that owns this step, then measure its target
  useEffect(() => {
    setTutorial({ currentStep: step.id })
    // start a real workout before the exercise/setlog/rest steps so the UI exists
    if (['exercise', 'setlog', 'rest'].includes(step.id)) ensureWorkout()
    if (step.route) nav(step.route)
    let raf2, raf3, alive = true
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        raf3 = requestAnimationFrame(() => {
          const el = document.querySelector(`[data-giwi="${step.target}"]`)
          if (el) el.scrollIntoView({ block: 'center' })
          if (!alive) return
          measure(el)
        })
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
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); cancelAnimationFrame(raf3)
      window.removeEventListener('resize', onReflow); window.removeEventListener('scroll', onReflow, true) }
  }, [idx, step])

  const finish = skipped => {
    setTutorial({ completed: true, skipped: !!skipped, currentStep: null })
    onDone?.()
  }

  const copy = copyFor(step.id)
  const pad = 10
  const hasTarget = !!rect && rect.width > 0
  const tooltipBelow = hasTarget && rect && rect.top < window.innerHeight / 2

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, pointerEvents: 'none' }}>
      {/* spotlight cut-out */}
      {rect && <div style={{ position: 'fixed', top: rect.top - pad, left: rect.left - pad,
        width: rect.width + pad * 2, height: rect.height + pad * 2, borderRadius: 14,
        boxShadow: '0 0 0 9999px rgba(0,0,0,.65)', pointerEvents: 'none',
        border: '2px solid var(--acc)', transition: 'all .25s ease' }} />}
      {!hasTarget && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)' }} />}

      {/* tooltip — always on top, always visible */}
      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)',
        zIndex: 301, pointerEvents: 'auto',
        ...(hasTarget && rect && rect.top > window.innerHeight / 2
          ? { top: 24 } : hasTarget ? { top: (rect.top + rect.height + 16) } : { top: '50%', transform: 'translate(-50%,-50%)' }),
        width: 'min(420px, calc(100vw - 32px))' }}>
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 16,
          border: '1px solid var(--sep)', boxShadow: '0 8px 32px rgba(0,0,0,.4)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Giwi state="point" size={64} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 4, color: 'var(--label)' }}>{t(copy.title)}</div>
              <div style={{ fontSize: 14, lineHeight: 1.45, color: 'var(--label-2)' }}>{t(copy.body)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
            <span style={{ fontSize: 12, color: 'var(--label-2)' }}>{idx + 1} / {TUTORIAL_STEPS.length}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ background: 'none', border: 'none', color: 'var(--label-2)', cursor: 'pointer', fontSize: 14, padding: '6px 10px' }}
                onClick={() => finish(true)}>{t('Skip')}</button>
              <button style={{ background: 'var(--acc)', color: 'var(--on-acc)', border: 'none', borderRadius: 'var(--r-sm)',
                padding: '8px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
                onClick={() => {
                  if (idx >= TUTORIAL_STEPS.length - 1) finish(false)
                  else setIdx(i => i + 1)
                }}>{idx >= TUTORIAL_STEPS.length - 1 ? t('Done') : t('Continue')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
