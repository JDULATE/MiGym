// TabBar V2.1 — floating glass DOCK (detached pill, not a full-width bar).
// Icon-only (labels live in aria-labels); spring pill chases the active slot;
// center Start protrudes above the dock edge like a physical button.
import { useEffect, useRef, useState } from 'react'
import { createSpring } from '../motion/spring.js'
import Icon from '../../components/Icon.jsx'

const SLOTS = [
  { k: 'home', icon: 'house', label: 'Inicio' },
  { k: 'plan', icon: 'calendar', label: 'Plan' },
  { k: '__start' },
  { k: 'stats', icon: 'chart', label: 'Progreso' },
  { k: 'coaches', icon: 'personCircle', label: 'Coaches' },
]

export default function TabBar2({ active, onChange, onStart, startLive }) {
  const dockRef = useRef(null)
  const pillRef = useRef(null)
  const [slotW, setSlotW] = useState(0)
  const idx = SLOTS.findIndex(s => s.k === active)
  const sx = useRef(null)

  useEffect(() => {
    const measure = () => setSlotW((dockRef.current?.clientWidth || 0) / SLOTS.length)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  useEffect(() => {
    if (!sx.current) sx.current = createSpring({ response: 0.38, damping: 0.9, onUpdate: v => {
      if (pillRef.current) pillRef.current.style.transform = `translateX(${v.toFixed(1)}px)`
    } })
    if (slotW) sx.current.set(idx * slotW + (slotW - 38) / 2)
  }, [idx, slotW])

  return (
    <nav className="v2-dock" ref={dockRef}>
      <span className="v2-pill" ref={pillRef} aria-hidden />
      {SLOTS.map(s => s.k === '__start' ? (
        <button key={s.k} className={'v2-start pressable' + (startLive ? ' live' : '')}
          onClick={onStart} aria-label={startLive ? 'Reanudar entrenamiento' : 'Comenzar entrenamiento'}>
          <span className="cir"><Icon name={startLive ? 'pause' : 'dumbbell'} size={22} /></span>
        </button>
      ) : (
        <button key={s.k} className={'v2-tab pressable' + (active === s.k ? ' on' : '')}
          onClick={() => onChange(s.k)} aria-label={s.label}>
          <Icon name={s.icon} size={22} />
        </button>
      ))}
    </nav>
  )
}
