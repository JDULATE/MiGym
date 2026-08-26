// Audit: onboarding/dialogue keys missing per locale pack.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'locales')
const KEYS = [
  // dialogue.js source strings
  'Welcome to MiGym', 'Hi! I’m Giwi — I’ll help you set MiGym up for you.',
  'Start', 'Skip', 'What language do you prefer?', 'First, what’s your name?', 'Your name',
  'Nice to meet you, {0}!', 'How old are you?', 'Age', 'What do you weigh right now?',
  'Current weight', 'What’s your height?', 'Height', 'What’s your main goal?',
  'What are your goals? Pick as many as you like.', 'What’s your experience level?',
  'How many days per week can you train?', 'Your profile', 'Confirm', 'Edit',
  'Perfect! I know a little about you now.', 'Now I’ll show you how MiGym works.',
  'years', 'Let’s go!',
  // newer feature strings used by onboarding
  'Do you take any supplements?', 'I’ll remind you every day.', 'Which one? (e.g. Omega 3)',
  'None for now', 'Creatine', 'Protein', 'Pre-workout', 'Amino acids', 'Other',
  'Back', 'Continue', 'Supplements',
]

let issues = 0
for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.js') && x !== 'index.js')) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8')
  const missing = KEYS.filter(k => !src.includes("'" + k + "'") && !src.includes('"' + k + '"'))
  if (missing.length) { console.log(f, '→ missing:', JSON.stringify(missing)); issues++ }
}
if (!issues) console.log('all packs complete')
