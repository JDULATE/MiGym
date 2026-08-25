import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { effectiveRoutine } from '../lib/history.js'
import { todayISO } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'

// Hoisted so a fresh component (and fresh state) isn't created every render.
// `...rest` carries stable data-giwi hooks used by the Giwi tutorial.
function Tab({ nav, active, icon, to, label, ...rest }) {
  return (
    <button className={active ? 'on' : ''} onClick={() => nav(to)} {...rest}>
      <Icon name={icon} /><span>{label}</span>
    </button>
  )
}

export default function TabBar({ onStart }) {
  const nav = useNavigate()
  const loc = useLocation()
  const S = useStore(s => s.S)
  const cur = loc.pathname.split('/')[1] || 'home'
  const on = k => cur === k || (cur === 'history' && k === 'stats') || (cur === 'settings' && k === 'home') || (cur === 'library' && k === 'plan')

  const startWorkout = () => {
    if (!S.active) {
      const r = effectiveRoutine(S, todayISO())
      if (r && r.ex.length) { onStart(r.id); return }
    }
    nav('/workout')
  }

  return (
    <nav id="tabbar">
      <Tab nav={nav} active={on('home')} icon="house" to="/home" label={t('Home')} />
      <Tab nav={nav} active={on('plan')} icon="calendar" to="/plan" label={t('Plan')} data-giwi="navigation-routines" />
      <button className={'start' + (S.active ? ' rec' : '')} data-giwi="start-workout" onClick={startWorkout}>
        <span className="cir"><Icon name={S.active ? 'play' : 'dumbbell'} /></span>
        <span>{S.active ? t('Resume') : t('Start')}</span>
      </button>
      <Tab nav={nav} active={on('stats')} icon="chart" to="/stats" label={t('Stats')} data-giwi="stats" />
      <Tab nav={nav} active={on('coaches')} icon="personCircle" to="/coaches" label={t('Coaches')} />
    </nav>
  )
}
