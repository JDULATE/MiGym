import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// The exercise dataset (~888 KB) ships as its own lazy chunk: load it, register it, and
// only then render the app — every consumer keeps synchronous access via lib/exercises.js.
// The index.html splash (dumbbell) covers this brief load.
const [{ EXDB }, { initExercises }, { MOBILE }] = await Promise.all([
  import('./lib/exercises-data.js'),
  import('./lib/exercises.js'),
  import('./lib/mobile.js'),
])
initExercises(EXDB)

const { default: App } = await import('./App.jsx')
createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>
)

// Not in the mobile build: the native shell already serves everything from disk.
if (!MOBILE && 'serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {})
}
