// Device-local Giwi flags (docs/ONBOARDING.md).
// Deliberately OUTSIDE the synced state S: onboarding/tutorial progress belongs to this
// device, while the profile fields themselves ride the normal sync rules via S.profile.

const ONBOARDING_KEY = 'migym_onboarding_v1'
const TUTORIAL_KEY = 'migym_tutorial_v1'

export const TUTORIAL_VERSION = 1

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : { ...fallback }
  } catch { return { ...fallback } }
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* private mode */ }
}

export function getOnboarding() {
  return read(ONBOARDING_KEY, { completed: false })
}
export function completeOnboarding() {
  write(ONBOARDING_KEY, { completed: true })
}
export function needsOnboarding() {
  return !getOnboarding().completed
}

export function getTutorial() {
  return read(TUTORIAL_KEY, { completed: false, skipped: false, version: TUTORIAL_VERSION, currentStep: null })
}
export function setTutorial(patch) {
  write(TUTORIAL_KEY, { ...getTutorial(), version: TUTORIAL_VERSION, ...patch })
}
export function resetTutorial() {
  write(TUTORIAL_KEY, { completed: false, skipped: false, version: TUTORIAL_VERSION, currentStep: null })
}
