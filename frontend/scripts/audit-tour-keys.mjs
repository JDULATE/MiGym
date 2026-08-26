// audit tour keys against es pack
import fs from 'node:fs'
const es = fs.readFileSync('C:/Users/ulate/MiGym/frontend/src/locales/es.js', 'utf8')
const keys = [
  'Your home', 'Routines', 'Start a workout', 'The current exercise', 'Log every set',
  'Rest timer', 'Progress',
  "Today's workout and a quick look at your progress live here.",
  'Organise your training days and pick the exercises for each one.',
  "When you're ready, this button starts today's session.",
  "During a session you'll see the exercise here, with your previous performance right under it.",
  'Weight, reps and optional effort per set - tick a row once you\'re done.',
  'It starts after each set so you can keep the pace without watching the clock.',
  'PRs, volume and consistency build up here over time.',
  'Done',
]
for (const k of keys) {
  const present = es.includes("'" + k + "'") || es.includes('"' + k + '"')
  console.log(present ? 'OK  ' : 'MISS', JSON.stringify(k))
}
