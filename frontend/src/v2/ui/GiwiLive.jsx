// GiwiLive — the mascot as a living character (UI-V2 pillar 5).
// Idle float (two independent springs, Lissajous drift) · leans toward the pointer ·
// fully draggable with grab-offset tracking, momentum projection and rubber-band bounds ·
// squash-stretch tap reaction with expression cycling. Reduced motion: everything static
// except direct 1:1 drag (no springs, no float).
import { useEffect, useMemo, useRef, useState } from 'react'
import Giwi from '../../giwi/Giwi.jsx'
import { createSpring, project, rubberband, prefersReducedMotion } from '../motion/spring.js'

const MOODS = ['idle', 'happy', 'curious', 'excited', 'shy', 'attentive', 'surprissed']

export default function GiwiLive({ size = 150, state = 'idle', onPoke, draggable = true }) {
  const boxRef = useRef(null)      // outer positioning layer (springs write here)
  const innerRef = useRef(null)    // squash-stretch layer
  const reduced = useMemo(() => prefersReducedMotion(), [])
  const [mood, setMood] = useState(state)
  const [prevProp, setPrevProp] = useState(state)
  if (prevProp !== state) { setPrevProp(state); setMood(state) }   // adjust-on-prop-change pattern

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    let px = 0, py = 0                       // live position
    let raf = null

    // springs: float drift + pointer lean + drag position (x/y decomposed per SKILL §3)
    const mk = o => createSpring({ ...o, onUpdate: v => { /* applied below */ } })
    const sx = mk(), sy = mk()               // drag/position x,y
    const lx = mk({ response: 0.45 }), ly = mk({ response: 0.45 })   // lean offsets

    const apply = () => {
      el.style.transform =
        `translate3d(${sx.value}px,${sy.value}px,0)` +
        ` rotate(${(lx.value * 0.06).toFixed(2)}deg)`
      if (innerRef.current)
        innerRef.current.style.transform = `translate(${lx.value.toFixed(1)}px,${ly.value.toFixed(1)}px)`
    }
    for (const s of [sx, sy, lx, ly]) { const prev = s.onUpdate; s.onUpdate = v => { prev(v); apply() } }

    // idle float — retarget on every settle so it never loops mechanically
    let floatT = null
    const drift = () => {
      if (reduced || dragging) return
      lx.set((Math.random() * 10 - 5))
      ly.set((Math.random() * 8 - 4))
      floatT = setTimeout(drift, 1400 + Math.random() * 1600)
    }
    if (!reduced) floatT = setTimeout(drift, 800)

    // pointer awareness — lean gently toward a nearby cursor/finger (not while dragging)
    const zone = e => {
      if (reduced || dragging) return
      const r = el.getBoundingClientRect()
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height / 2)
      const near = Math.hypot(dx, dy) < 220
      lx.set(near ? Math.max(-14, Math.min(14, dx * 0.12)) : 0)
      ly.set(near ? Math.max(-10, Math.min(10, dy * 0.10)) : 0)
    }
    window.addEventListener('pointermove', zone)

    // drag — 1:1 with grab offset, velocity history, momentum release
    let dragging = false
    let grabbed = { dx: 0, dy: 0 }, lastPos = [], velX = 0, velY = 0
    let pressT = 0, moved = 0, startX = 0, startY = 0
    const W = () => window.innerWidth - el.offsetWidth
    const H = () => window.innerHeight - el.offsetHeight

    const down = e => {
      pressT = performance.now(); moved = 0; startX = e.clientX; startY = e.clientY
      grabbed = { dx: e.clientX - px, dy: e.clientY - py }
      lastPos = [{ x: e.clientX, y: e.clientY, t: pressT }]
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      // respond on pointer-down (SKILL §1): a tiny lift before we know it's a drag
      if (!reduced) { sx.set(px, { velocity: 0 }); sy.set(py) }
      el.setPointerCapture?.(e.pointerId)
    }
    const move = e => {
      moved = Math.max(moved, Math.hypot(e.clientX - startX, e.clientY - startY))
      if (!dragging && moved < 8) return                    // hysteresis ~8px
      dragging = true
      px = e.clientX - grabbed.dx
      py = e.clientY - grabbed.dy
      sx.jump(px); sy.jump(py)                              // 1:1, no spring lag mid-drag
      const now = performance.now()
      lastPos.push({ x: e.clientX, y: e.clientY, t: now })
      while (lastPos.length > 1 && now - lastPos[0].t > 100) lastPos.shift()
      squash(dragging ? 0.96 : 1)
    }
    const up = e => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      if (performance.now() - pressT < 250 && moved < 8) {   // a poke, not a drag
        poke(); return
      }
      if (!dragging) return
      dragging = false
      const n = lastPos[lastPos.length - 1], o = lastPos[0]
      const dt = Math.max(16, n.t - o.t)
      velX = ((n.x - o.x) / dt) * 1000
      velY = ((n.y - o.y) / dt) * 1000
      // project where the flick wants to go, then rubber-band into bounds
      let tx = px + project(velX), ty = py + project(velY)
      tx = tx < 0 ? rubberband(tx, W()) : tx > W() ? W() + rubberband(tx - W(), W()) : tx
      ty = ty < 0 ? rubberband(ty, H()) : ty > H() ? H() + rubberband(ty - H(), H()) : ty
      px = tx; py = ty
      sx.set(tx, { velocity: velX }); sy.set(ty, { velocity: velY })     // velocity handoff
      squash(1)
      setMood(Math.hypot(velX, velY) > 900 ? 'surprissed' : 'happy')
    }
    el.addEventListener('pointerdown', down)

    // squash-stretch pop — scale springs feel physical on commit moments
    function squash(to) {
      if (!innerRef.current || reduced) return
      innerRef.current.style.transition = 'transform 120ms ease-out'
      requestAnimationFrame(() => {
        if (innerRef.current) innerRef.current.style.scale = to
      })
    }

    function poke() {
      setMood(m => MOODS[(MOODS.indexOf(m) + 1) % MOODS.length])
      onPoke?.()
      if (!innerRef.current || reduced) return
      const el2 = innerRef.current
      el2.style.transition = 'scale 90ms ease-out'
      el2.style.scale = '0.88'
      setTimeout(() => { el2.style.scale = '1.06'; setTimeout(() => { el2.style.scale = '1'; el2.style.transition = '' }, 110) }, 90)
    }

    return () => {
      clearTimeout(floatT)
      window.removeEventListener('pointermove', zone)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      el.removeEventListener('pointerdown', down)
      for (const s of [sx, sy, lx, ly]) s.stop()
      cancelAnimationFrame(raf)
    }
  }, [reduced])

  return (
    <div ref={boxRef} style={{ width: size, height: size, touchAction: 'none',
      cursor: draggable ? 'grab' : 'default', userSelect: 'none', willChange: 'transform' }}>
      <div ref={innerRef} style={{ width: '100%', height: '100%' }}>
        <Giwi state={mood} size={size} />
      </div>
    </div>
  )
}
