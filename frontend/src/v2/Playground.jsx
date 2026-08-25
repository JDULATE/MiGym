// /v2 — UI-V2 playground. A living spec: tokens, type scale, and the new physics
// (springs + momentum + rubber-band) embodied by GiwiLive and a draggable card.
import { useEffect, useRef } from 'react'
import { createSpring, project, rubberband, prefersReducedMotion } from './motion/spring.js'
import GiwiLive from './ui/GiwiLive.jsx'
import './v2.css'

function SpringCard() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduced = prefersReducedMotion()
    let x = 24, dragging = false, grabbedX = 0, trail = [], vel = 0
    const apply = () => { el.style.left = x.toFixed(1) + 'px' }
    apply()
    const sx = createSpring({ value: x, response: 0.4, damping: 0.85, onUpdate: v => { x = v; el.style.left = v + 'px' } })
    const W = () => el.parentElement.clientWidth - el.offsetWidth - 24
    const down = e => {
      dragging = true; grabbedX = e.clientX - x
      trail = [{ x: e.clientX, t: performance.now() }]
      el.setPointerCapture?.(e.pointerId)
    }
    const move = e => {
      if (!dragging) return
      x = Math.max(12, Math.min(W(), e.clientX - grabbedX))
      el.style.transition = 'none'; apply()
      const now = performance.now(); trail.push({ x: e.clientX, t: now })
      while (trail.length > 1 && now - trail[0].t > 100) trail.shift()
    }
    const up = e => {
      if (!dragging) return; dragging = false
      const n = trail[trail.length - 1], o = trail[0]
      vel = ((n.x - o.x) / Math.max(16, n.t - o.t)) * 1000
      if (reduced) return                       // reduced motion: stay where released
      let tx = x + project(vel)
      tx = Math.max(12, Math.min(W(), tx < 12 ? 12 + rubberband(tx - 12, W()) : tx > W() ? W() + rubberband(tx - W(), W()) : tx))
      sx.set(tx, { velocity: vel })             // velocity handoff → spring finishes the throw
    }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      sx.stop()
    }
  }, [])
  return (
    <div className="v2-stage">
      <span className="v2-hint">Arrastra la tarjeta y suéltala con impulso — proyecta, rebota y se asienta</span>
      <div ref={ref} className="v2-card" style={{ position: 'absolute', top: 84, left: 24, width: 190,
        touchAction: 'none', cursor: 'grab', userSelect: 'none' }}>
        <b style={{ letterSpacing: '-.01em' }}>spring.card</b>
        <div className="c" style={{ marginTop: 6 }}>damping 0.85 · response 0.4<br />solo si hubo flick</div>
      </div>
    </div>
  )
}

export default function Playground() {
  return (
    <div className="v2">
      <div className="v2-wrap">
        <h1>UI V2 · Playground</h1>
        <div className="sub">La nueva física de MiGym: springs con handoff de velocidad,
          momentum proyectado y límites con rubber-band. Todo sin dependencias nuevas.</div>

        <div className="v2-sec"><h2>Giwi vivo</h2>
          <div className="v2-stage">
            <span className="v2-hint">Acércale el cursor — lo sigue. Arrástralo y lanzalo. Tócalo para cambiar su ánimo.</span>
            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-46%)' }}>
              <GiwiLive size={170} state="happy" />
            </div>
          </div>
        </div>

        <div className="v2-sec"><h2>Momentum</h2><SpringCard /></div>

        <div className="v2-sec"><h2>Tipografía óptica</h2>
          <div className="v2-card v2-type">
            <div className="d1">Entrena calmado</div>
            <div className="d2">Progresa seguro</div>
            <div className="b">Jerarquía por peso + tamaño + interlineado como conjunto. Tracking negativo en display, casi cero en cuerpo.</div>
            <div className="c">METADATO · 12.5px · tracking ligeramente positivo para legibilidad</div>
          </div>
        </div>

        <div className="v2-sec"><h2>Tokenes semánticos</h2>
          <div className="v2-swatches">
            {[['--bg'], ['--sur'], ['--sep'], ['--acc'], ['--acc-soft'], ['--green'], ['--red']].map(([v]) => (
              <span key={v} className="v2-sw"><i style={{ background: `var(${v})` }} />{v}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
