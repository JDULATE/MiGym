// Giwi — MiGym's mascot. Original inline-SVG character, no dependencies.
// States are CSS classes (giwi--state); unknown states fall back to idle styling.
// All motion lives in giwi.css and collapses under prefers-reduced-motion.
import './giwi.css'
export default function Giwi({ state = 'idle', size = 120, label = 'Giwi' }) {
  const cls = `giwi giwi--${['idle', 'welcome', 'thinking', 'wave', 'point', 'happy', 'encourage', 'celebrate'].includes(state) ? state : 'idle'}`
  return (
    <svg viewBox="0 0 120 130" width={size} height={size} role="img" aria-label={label} className={cls}>
      <g className="giwi-body">
        <path className="giwi-shape" d="M60 12 C88 12 104 32 104 62 C104 96 86 118 60 118 C34 118 16 96 16 62 C16 32 32 12 60 12 Z"
          fill="var(--color-surface-2)" stroke="var(--text-1)" strokeWidth="3.5" />
        <ellipse className="giwi-eye" cx="45" cy="56" rx="6.5" ry="9" />
        <ellipse className="giwi-eye" cx="75" cy="56" rx="6.5" ry="9" />
        <path className="giwi-mouth" d="M48 84 Q60 92 72 84" fill="none"
          stroke="var(--text-1)" strokeWidth="4" strokeLinecap="round" />
        <circle className="giwi-cheek" cx="36" cy="76" r="6" />
        <circle className="giwi-cheek" cx="84" cy="76" r="6" />
      </g>
    </svg>
  )
}
