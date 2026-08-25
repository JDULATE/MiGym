// GiwiLive — the mascot as a living character (UI-V2 pillar 5).
// Works in LOCAL stage coordinates: the component owns its position inside its parent
// (.v2-stage or any positioned container), so drag/flick/bounds are truly multidirectional.
//   • idle float on its own spring channel (fx,fy) — never fights pointer-lean
//   • leans toward a nearby pointer (lx,ly springs, inner layer + slight rotate)
//   • drag: 1:1 with grab offset → release projects momentum → rubber-band bounds
//   • tap (<250ms, <8px): squash-stretch pop + next mood from ALL ten expressions
import { useEffect, useMemo, useRef, useState } from 'react'
import Giwi from '../../giwi/Giwi.jsx'
import { createSpring, project, rubberband, prefersReducedMotion } from '../motion/spring.js'

const MOODS = ['idle', 'happy', 'curious', 'excited', 'shy', 'attentive', 'surprissed', 'angry', 'scared', 'unimpressed']

export default function GiwiLive({ size = 150, state = 'idle', onPoke }) {
  const boxRef = useRef(null)
  const innerRef = useRef(null)
  const reduced = useMemo(() => prefersReducedMotion(), [])
  const [mood, setMood] = useState(state)
  const [prevProp, setPrevProp] = useState(state)
  if (prevProp !== state) { setPrevProp(state); setMood(state) }

  useEffect(() => {
    const el = boxRef.current
    if (!el) return

    // local position (top-left within parent) starts centered
    let x = 0, y = 0, dragging = false
    let floatX = 0, floatY = 0            // drift channel, applied additively
    const apply = () => {
      el.style.transform =
        `translate3d(${(x + floatX).toFixed(1)}px,${(y + floatY).toFixed(1)}px,0)` +
        ` rotate(${(lean.x.value * 0.05).toFixed(2)}deg)`
      if (innerRef.current)
        innerRef.current.style.transform = `translate(${lean.x.value.toFixed(1)}px,${lean.y.value.toFixed(1)}px)`
    }
    const sx = createSpring({ response: 0.4, damping: 0.85, onUpdate: v => { x = v; apply() } })
    const sy = createSpring({ response: 0.4, damping: 0.85, onUpdate: v => { y = v; apply() } })
    const fx = createSpring({ response: 1.1, damping: 1, onUpdate: v => { floatX = v; apply() } })
    const fy = createSpring({ response: 1.2, damping: 1, onUpdate: v => { floatY = v; apply() } })
    const lean = { x: createSpring({ response: 0.3, damping: 1, onUpdate: apply }), y: createSpring({ response: 0.3, damping: 1, onUpdate: apply }) }

    const stageRect = () => el.parentElement.getBoundingClientRect()
    // center on mount once the layout is measurable
    requestAnimationFrame(() => {
      const r = stageRect()
      x = (r.width - size) / 2; y = (r.height - size) / 2 - 8
      sx.jump(x); sy.jump(y)
    })

    const bounds = () => {
      const r = stageRect()
      return { w: r.width - size, h: r.height - size }
    }
    const softClamp = (v, max) =>
      v < 0 ? rubberband(v, max || 1) : v > max ? max + rubberband(v - max, max || 1) : v

    // idle float — its own channel; pauses while the pointer is close or a drag runs
    let floatT = null
    const drift = () => {
      if (!reduced && !dragging) {
        const near = Math.abs(lean.x.target) > 1
        if (!near) {
          fx.set(Math.random() * 10 - 5)
          fy.set(Math.random() * 8 - 4)
        }
        floatT = setTimeout(drift, 1500 + Math.random() * 1800)
      } else if (!reduced) {
        floatT = setTimeout(drift, 1200)
      }
    }
    if (!reduced) floatT = setTimeout(drift, 700)

    // pointer awareness — lean toward cursor when it's within ~200px of the mascot
    const zone = e => {
      if (reduced || dragging) return
      const r = el.getBoundingClientRect()
      const cx = r.left + size / 2, cy = r.top + size / 2
      const dx = e.clientX - cx, dy = e.clientY - cy
      const near = Math.hypot(dx, dy) < 200
      lean.x.set(near ? Math.max(-16, Math.min(16, dx * 0.14)) : 0)
      lean.y.set(near ? Math.max(-12, Math.min(12, dy * 0.11)) : 0)
    }
    window.addEventListener('pointermove', zone)

    function squash(to) {
      if (!innerRef.current || reduced) return
      innerRef.current.style.transition = 'scale 110ms ease-out'
      innerRef.current.style.scale = String(to)
    }

    function poke() {
      setMood(m => MOODS[(MOODS.indexOf(m) + 1) % MOODS.length])
      onPoke?.()
      if (!innerRef.current || reduced) return
      const el2 = innerRef.current
      el2.style.transition = 'scale 80ms ease-out'
      el2.style.scale = '0.86'
      setTimeout(() => { el2.style.scale = '1.07'; setTimeout(() => { el2.style.scale = '1'; el2.style.transition = '' }, 110) }, 80)
    }

    let grabbed = { dx: 0, dy: 0 }, trail = [], pressT = 0, moved = 0, lastP = null
    const down = e => {
      pressT = performance.now(); moved = 0; lastP = { x: e.clientX, y: e.clientY }
      const sr = stageRect()
      grabbed = { dx: e.clientX - sr.left - x, dy: e.clientY - sr.top - y }
      trail = [{ x: e.clientX, y: e.clientY, t: pressT }]
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      squash(0.97)                                   // respond on pointer-down
      e.preventDefault()
    }
    const move = e => {
      const p = { x: e.clientX, y: e.clientY }
      const d = Math.hypot(p.x - lastP.x, p.y - lastP.y)
      lastP = p
      if (!dragging) {
        moved += d
        if (moved < 8) return                        // hysteresis before committing to drag
        dragging = true
      }
      const sr = stageRect()
      x = softClamp(e.clientX - sr.left - grabbed.dx, bounds().w)   // overshoot allowed,
      y = softClamp(e.clientY - sr.top - grabbed.dy, bounds().h)    // rubber-banded
      sx.jump(x); sy.jump(y)
      trail.push({ x: e.clientX, y: e.clientY, t: performance.now() })
      while (trail.length > 1 && performance.now() - trail[0].t > 100) trail.shift()
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      squash(1)
      if (!dragging && performance.now() - pressT < 250 && moved < 8) { poke(); return }
      if (!dragging) return
      dragging = false
      const n = trail[trail.length - 1], o = trail[0]
      vel = { x: ((n.x - o.x) / Math.max(16, n.t - o.t)) * 1000, y: ((n.y - o.y) / Math.max(16, n.t - o.t)) * 1000 }
      const b = bounds()
      const tx = softClamp(x + project(vel.x), b.w)                 // momentum projection,
      const ty = softClamp(y + project(vel.y), b.h)                 // then hard-clamped in
      x = Math.max(0, Math.min(b.w, tx)); y = Math.max(0, Math.min(b.h, ty))
      sx.set(x, { velocity: vel.x }); sy.set(y, { velocity: vel.y })  // velocity handoff
      setMood(m => Math.hypot(vel.x, vel.y) > 900 ? 'surprissed' : m === 'idle' ? 'happy' : m)
    }
    let vel = { x: 0, y: 0 }
    el.addEventListener('pointerdown', down)

    return () => {
      clearTimeout(floatT)
      window.removeEventListener('pointermove', zone)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      el.removeEventListener('pointerdown', down)
      for (const s of [sx, sy, fx, fy, lean.x, lean.y]) s.stop()
    }
  }, [reduced, size])

  return (
    <div ref={boxRef} style={{ width: size, height: size, position: 'absolute', left: 0, top: 0,
      touchAction: 'none', cursor: 'grab', userSelect: 'none', willChange: 'transform' }}>
      <div ref={innerRef} style={{ width: '100%', height: '100%' }}>
        <Giwi state={mood} size={size} />
      </div>
    </div>
  )
}
