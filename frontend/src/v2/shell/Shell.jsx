// Shell V2 — the new application chrome: translucent tab bar, spring screen enter,
// center Start action. Screens mount inside <Screen> for the fade+rise transition
// (critically damped, disabled under reduced motion).
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { effectiveRoutine } from '../../lib/history.js'
import { todayISO } from '../../lib/format.js'
import { t } from '../../lib/i18n.js'
import { prefersReducedMotion } from '../motion/spring.js'
import TabBar2 from './TabBar2.jsx'
import HomeScreen from '../screens/HomeScreen.jsx'

function Screen({ children }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current && !prefersReducedMotion()) {
      const el = ref.current
      el.animate(
        [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 260, easing: 'cubic-bezier(.32,.72,0,1)' },
      )
    }
  }, [])
  return <div className="v2-screen" ref={ref}>{children}</div>
}

function Placeholder({ name }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 24px' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🚧</div>
      <div style={{ fontWeight: 700, fontSize: 18 }}>{name} · V2 en construcción</div>
      <div className="muted" style={{ marginTop: 8, fontSize: '.9rem' }}>
        Esta pantalla llega en la siguiente pasada de paridad.<br />
        La versión actual sigue disponible.
      </div>
      <button className="v2-linklike" onClick={() => { window.location.hash = '#/' + (name === 'Plan' ? 'plan' : 'coaches') }}>
        Abrir versión actual ↗
      </button>
    </div>
  )
}

export default function Shell() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const [tab, setTab] = useState('home')
  const routine = effectiveRoutine(S, todayISO())
  const startLive = !!S.active

  const onStart = () => {
    if (S.active) return nav('/workout')
    if (routine?.ex.length) return nav('/workout') // V1 start flow until workout V2 lands
    nav('/plan')
  }

  return (
    <div className="v2-app">
      <Screen key={tab}>
        {tab === 'home' && <HomeScreen onGoSettings={() => nav('/settings')} />}
        {tab === 'plan' && <Placeholder name="Plan" />}
        {tab === 'stats' && <Placeholder name="Progreso" />}
        {tab === 'coaches' && <Placeholder name="Coaches" />}
      </Screen>
      <TabBar2 active={tab} onChange={setTab} onStart={onStart} startLive={startLive} />
    </div>
  )
}
