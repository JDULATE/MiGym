// V2 motion engine — hand-rolled springs per Apple's fluid-interfaces model (ADR-0003:
// no new deps). Damping ratio ζ + response τ map to physical stiffness/damping like
// Motion/Framer do: ω0 = 2π/τ, k = ω0², c = 2ζω0. Semi-implicit Euler at rAF dt.
//
// One shared rAF loop runs while any spring is in motion. onUpdate receives the live
// value every frame — apply it straight to style.transform/opacity (compositor-friendly).

const active = new Set()
let rafId = null
let last = 0

function tick(now) {
  const dt = Math.min(0.032, (now - last) / 1000) || 0.016
  last = now
  for (const s of [...active]) s.step(dt)
  rafId = active.size ? requestAnimationFrame(tick) : null
}

function wake(s) {
  active.add(s)
  if (!rafId) { last = performance.now(); rafId = requestAnimationFrame(tick) }
}

export function createSpring({
  value = 0,
  velocity = 0,
  damping = 1,      // ζ: 1.0 critically damped (default UI), ~0.8 momentum flicks
  response = 0.35,  // τ seconds to target — not a duration; settle time emerges
  epsilon = 0.01,
  onUpdate = () => {},
} = {}) {
  const w0 = (2 * Math.PI) / Math.max(0.05, response)
  const k = w0 * w0
  const c = 2 * damping * w0

  const spring = {
    target: value,
    moving: false,

    set(target, opts = {}) {
      if (opts.velocity != null) spring.velocity = opts.velocity   // velocity handoff
      spring.target = target
      if (!spring.moving) wake(spring)
    },
    impulse(v) { spring.velocity = v; if (!spring.moving) wake(spring) },
    jump(v) { spring.value = v; spring.velocity = 0; onUpdate(spring.value) },

    step(dt) {
      const a = -k * (spring.value - spring.target) - c * spring.velocity
      spring.velocity += a * dt
      spring.value += spring.velocity * dt
      if (Math.abs(spring.value - spring.target) < epsilon && Math.abs(spring.velocity) < epsilon) {
        spring.value = spring.target
        spring.velocity = 0
        spring.moving = false
        active.delete(spring)
      }
      onUpdate(spring.value)
    },
    stop() { spring.moving = false; active.delete(spring) },
  }
  spring.value = value
  spring.velocity = velocity
  return spring
}

// Momentum projection (Apple's exact deceleration form): where would a flick land?
export const project = (v, d = 0.998) => (v / 1000) * d / (1 - d)

// Rubber-band: progressive resistance past a boundary instead of a hard stop.
export function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot))
}

export const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
