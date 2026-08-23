// Runs before every test file. Guarantees a FUNCTIONAL localStorage:
// Node ≥26 exposes an experimental global localStorage that is inert unless
// --localstorage-file is passed, which previously shadowed happy-dom's storage
// and broke tests (see context.md "Known limitations"). If whatever is present
// cannot actually store anything, replace it with a Map-backed implementation.
function usable() {
  try {
    globalThis.localStorage.setItem('__migym_probe', '1')
    const ok = globalThis.localStorage.getItem('__migym_probe') === '1'
    globalThis.localStorage.removeItem('__migym_probe')
    return ok
  } catch { return false }
}

if (!usable()) {
  const m = new Map()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: {
      getItem: k => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: k => m.delete(k),
      clear: () => m.clear(),
      key: i => [...m.keys()][i] ?? null,
      get length() { return m.size },
    },
  })
}

// Populate the exercise registry so tests that resolve ids (starter templates,
// progression increments, taxonomy grouping) see the real catalogue.
const [{ EXDB }, { initExercises }] = await Promise.all([
  import('./src/lib/exercises-data.js'),
  import('./src/lib/exercises.js'),
])
initExercises(EXDB)
