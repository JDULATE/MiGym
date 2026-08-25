// Giwi — MiGym's mascot. Each mood is a pre-animated expression SVG (self-contained:
// the keyframes travel inside the file, so motion survives <img> embedding and reduced-
// motion can be honoured by pausing via CSS if needed).
// Expression map: Giwi state → artwork. Unknown states fall back to neutral.
import neutral from './expressions/giwi neutral.svg'
import excited from './expressions/giwi excited.svg'
import happy from './expressions/giwi happy.svg'
import attentive from './expressions/giwi attentive.svg'
import curious from './expressions/giwi curious.svg'
import shy from './expressions/giwi shy.svg'
import surprissed from './expressions/giwi surprissed.svg'
import angry from './expressions/giwi angry.svg'
import scared from './expressions/giwi scared.svg'
import unimpressed from './expressions/giwi unimpressed.svg'

const EXPRESSIONS = {
  idle: neutral,
  neutral,
  welcome: excited,
  thinking: attentive,
  point: curious,
  wave: happy,
  happy,
  curious,
  excited,
  shy,
  attentive,
  surprissed,
  surprised: surprissed,
  angry,
  scared,
  unimpressed,
}

export default function Giwi({ state = 'idle', size = 120, label = 'Giwi' }) {
  const src = EXPRESSIONS[state] || neutral
  return (
    <img src={src} width={size} height={size} role="img" aria-label={label}
      className="giwi" alt={label} draggable="false" />
  )
}
