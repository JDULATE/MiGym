// Declarative walkthrough steps (docs/TUTORIAL.md). Targets resolve through stable
// data-giwi attributes — never CSS classes or DOM position.
export const TUTORIAL_STEPS = [
  { id: 'dashboard', target: 'home-today', route: '/home' },
  { id: 'routines', target: 'navigation-routines', route: '/plan' },
  { id: 'start', target: 'start-workout', route: '/home' },
  { id: 'exercise', target: 'exercise', route: '/workout', liveOnly: true },
  { id: 'setlog', target: 'set-row', route: '/workout', liveOnly: true },
  { id: 'rest', target: 'rest-timer', route: '/workout', liveOnly: true },
  { id: 'progress', target: 'stats', route: '/stats' },
]

const COPY = {
  dashboard: {
    title: 'Your home',
    body: 'Today’s workout and a quick look at your progress live here.',
  },
  routines: {
    title: 'Routines',
    body: 'Organise your training days and pick the exercises for each one.',
  },
  start: {
    title: 'Start a workout',
    body: 'When you’re ready, this button starts today’s session.',
  },
  exercise: {
    title: 'The current exercise',
    body: 'During a session you’ll see the exercise here, with your previous performance right under it.',
  },
  setlog: {
    title: 'Log every set',
    body: 'Weight, reps and optional effort per set — tick a row once you’re done.',
  },
  rest: {
    title: 'Rest timer',
    body: 'It starts after each set so you can keep the pace without watching the clock.',
  },
  progress: {
    title: 'Progress',
    body: 'PRs, volume and consistency build up here over time.',
  },
}

/** Copy for one step id. Returns { title, body } or undefined for unknown ids. */
export const copyFor = id => COPY[id]
