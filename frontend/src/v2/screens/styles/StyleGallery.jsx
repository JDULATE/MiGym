// Style bake-off gallery — /styles lists the five candidates, /styles/sN previews one
// full-screen with a switcher chip. Same engine feed (useHomeData) for all five.
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useStore } from '../../../store/useStore.js'
import HomeS1 from './HomeS1.jsx'
import HomeS2 from './HomeS2.jsx'
import HomeS3 from './HomeS3.jsx'
import HomeS4 from './HomeS4.jsx'
import HomeS5 from './HomeS5.jsx'
import './homeStyles.css'

const STYLES = [
  { id: 's1', name: 'Aurora', desc: 'Escena inmersiva oscura, gradientes azules, glifo fantasma. La evolución directa de lo que ya aprobaste.' },
  { id: 's2', name: 'Editorial', desc: 'Papel claro tipo revista suiza: tipografía enorme, líneas finas, un solo acento. Cero decoración.' },
  { id: 's3', name: 'Glass Play', desc: 'Malla pastel azul-violeta con tarjetas de vidrio inclinadas y Giwi asomándose. Juguetón y táctil.' },
  { id: 's4', name: 'Instrument', desc: 'Grafito denso tipo panel de atleta: numerales mono, tiles con barra de progreso semanal, botón losa.' },
  { id: 's5', name: 'Zen Ring', desc: 'Minimalismo cálido: un anillo de progreso semanal con el Start dentro. Calma absoluta.' },
]

function Switcher({ current }) {
  return (
    <div className="v2-switch">
      {STYLES.map(s => (
        <button key={s.id} className={current === s.id ? 'on' : ''}
          onClick={() => { window.location.hash = '#/styles/' + s.id }}>{s.name}</button>
      ))}
      <button className="close" onClick={() => { window.location.hash = '#/styles' }} aria-label="Cerrar">✕</button>
    </div>
  )
}

export default function StyleGallery() {
  const loc = useLocation()
  const boot = useStore(s => s.boot)
  useState(() => { boot() })
  const sid = (loc.pathname.match(/\/styles\/(s\d)/) || [])[1]

  if (!sid) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--label)', padding: '40px 20px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h1 style={{ letterSpacing: '-.03em', fontSize: 32 }}>Bake-off · 5 Homes V2</h1>
          <p className="muted" style={{ marginTop: 8 }}>Mismos motores, cinco personalidades. Elige la que definirá el lenguaje visual del nuevo frontend.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 14, marginTop: 26 }}>
            {STYLES.map((s, i) => (
              <button key={s.id} onClick={() => { window.location.hash = '#/styles/' + s.id }}
                className="v2-card" style={{ textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <b style={{ fontSize: 22, opacity: .35 }}>{i + 1}</b>
                  <b>{s.name}</b>
                </div>
                <div className="muted small" style={{ marginTop: 6, lineHeight: 1.5 }}>{s.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const Comp = { s1: HomeS1, s2: HomeS2, s3: HomeS3, s4: HomeS4, s5: HomeS5 }[sid]
  return (
    <>
      <Switcher current={sid} />
      <Comp />
    </>
  )
}
