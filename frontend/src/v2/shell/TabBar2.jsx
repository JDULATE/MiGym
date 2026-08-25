// TabBar V2 — five slots around a center Start, spring-sliding pill behind the active
// icon (one shared x-spring retargets on change: interruptible by design), translucent
// material per SKILL §12, press feedback on pointer-down via CSS (:active scale).
import { useEffect, useRef, useState } from 'react'
import { createSpring } from '../motion/spring.js'
import Icon from '../../components/Icon.jsx'
import { t } from '../../lib/i18n.js'

const SLOTS = [
  { k: 'home', icon: 'house', label: 'Inicio' },
  { k: 'plan', icon: 'calendar', label: 'Plan' },
  { k: '__start' },
  { k: 'stats', icon: 'chart', label: 'Progreso' },
  { k: 'coaches', icon: 'personCircle', label: 'Coaches' },
]

export default function TabBar2({ active, onChange, onStart, startLive }) {
  const barRef = useRef(null)
  const pillRef = useRef(null)
  const [slotW, setSlotW] = useState(0)
  const idx = SLOTS.findIndex(s => s.k === active)
  const sx = useRef(null)

  useEffect(() => {
    const measure = () => {
      const w = barRef.current?.clientWidth || 0
      setSlotW(w / SLOTS.length)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  useEffect(() => {
    if (!sx.current) sx.current = createSpring({ response: 0.35, damping: 1, onUpdate: v => {
      if (pillRef.current) pillRef.current.style.transform = `translateX(${v.toFixed(1)}px)`
    } })
    if (slotW) sx.current.set(idx * slotW + (slotW - 40) / 2)
  }, [idx, slotW])

  return (
    <nav className="v2-tabbar" ref={barRef}>
      <span className="v2-pill" ref={pillRef} aria-hidden />
      {SLOTS.map(s => s.k === '__start' ? (
        <button key={s.k} className={'v2-start pressable' + (startLive ? ' live' : '')}
          onClick={onStart} aria-label={startLive ? t('Resume') : t('Start')}>
          <span className="cir"><Icon name={startLive ? 'play' : 'dumbbell'} size={20} /></span>
          <span className="lbl">{startLive ? t('Resume') : t('Start')}</span>
        </button>
      ) : (
        <button key={s.k} className={'v2-tab pressable' + (active === s.k ? ' on' : '')}
          onClick={() => onChange(s.k)} aria-label={t(s.label)}>
          <Icon name={s.icon} size={21} />
          <span className="lbl">{t(s.label)}</span>
        </button>
      ))}
    </nav>
  )
}
