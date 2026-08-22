// MiGym AI Coach (phase 9) — opt-in, local-first, bring-your-own-provider.
//
// Pipeline (spec §Phase 9): User Data → Training Analytics → Deterministic Rules →
// AI Coach → Explanation. Everything up to the AI is computed on-device by pure modules
// (analytics, engine, adaptive); the model only ever sees a compact digest of RECORDED
// facts and CALCULATED metrics, and may never invent data, diagnose, or override the
// deterministic rules.
//
// Privacy posture (ADR-0004):
//   · works with no account at all — guest mode and the mobile build included
//   · provider credentials live in their OWN localStorage key, deliberately OUTSIDE the
//     synced state blob S — they never sync, never appear in backups or exports
//   · nothing is sent anywhere until the user configures a provider; without one the
//     coach UI does not exist
//   · transport is OpenAI-compatible /chat/completions, which covers OpenAI, Groq,
//     OpenRouter, LM Studio and Ollama (`http://localhost:11434/v1`) alike

import { trainingSummary, exerciseMomentum } from './analytics.js'
import { adaptiveSuggestions } from './adaptive.js'
import { EXIDX } from './exercises.js'

export const COACH_CFG_KEY = 'migym_coach_cfg'
export const DEFAULT_PROVIDER = { baseUrl: 'http://localhost:11434/v1', model: '', key: '' }

/** Load the locally-stored provider config (never from S). Returns DEFAULT_PROVIDER when absent/invalid. */
export function loadCoachCfg() {
  try {
    const raw = JSON.parse(localStorage.getItem(COACH_CFG_KEY))
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_PROVIDER }
    return {
      baseUrl: String(raw.baseUrl || DEFAULT_PROVIDER.baseUrl),
      model: String(raw.model || ''),
      key: typeof raw.key === 'string' ? raw.key : '',
    }
  } catch { return { ...DEFAULT_PROVIDER } }
}

export function saveCoachCfg(cfg) {
  const clean = {
    baseUrl: String(cfg?.baseUrl || '').trim().replace(/\/+$/, '') || DEFAULT_PROVIDER.baseUrl,
    model: String(cfg?.model || '').trim(),
    key: typeof cfg?.key === 'string' ? cfg.key : '',
  }
  localStorage.setItem(COACH_CFG_KEY, JSON.stringify(clean))
  return clean
}

export const coachConfigured = cfg => !!(cfg && cfg.model && cfg.baseUrl)

/* ---------------------------- context builder ---------------------------- */

const MAX_WORKOUTS = 8          // keep prompts bounded on long histories
const MAX_SETS_SHOWN = 6

const setStr = (s, unit) => {
  if (s.min != null) return `${s.min}min @ ${s.speed ?? ''}km/h`
  if (s.sec != null) return `${s.sec}s${s.w > 0 ? ` +${s.w}${unit}` : ''}`
  const rir = s.rir != null ? ` @RIR${s.rir}` : s.rpe != null ? ` @RPE${s.rpe}` : ''
  return `${s.w > 0 ? s.w + unit + '×' : ''}${s.r}${rir}`
}

/**
 * The complete, size-bounded picture an AI is allowed to reason about. Two layers are
 * kept separate so answers can be held to the standard the spec demands:
 *   facts     — exactly what was recorded (workouts logged, weigh-ins, plan)
 *   computed  — what our deterministic modules derived FROM those facts
 */
export function buildCoachContext(S) {
  const unit = S.unit || 'kg'
  const nameOf = id => EXIDX[id]?.n || id
  const now = Date.now()

  const recentWorkouts = [...(S.workouts || [])]
    .sort((a, b) => (b.start || 0) - (a.start || 0))
    .slice(0, MAX_WORKOUTS)
    .map(w => ({
      date: w.d,
      name: w.name,
      durationMin: w.end && w.start ? Math.round((w.end - w.start) / 60000) : null,
      exercises: (w.entries || []).map(e => ({
        exercise: nameOf(e.id),
        sets: (e.sets || []).filter(s => s.done).slice(0, MAX_SETS_SHOWN).map(s => setStr(s, unit)),
        note: e.note || undefined,
      })),
    }))

  const summary = trainingSummary(S)
  const momentum = exerciseMomentum(S)
  const suggestions = adaptiveSuggestions(S).items.map(i => ({ kind: i.key, text: [i.title[0], ...i.title.slice(1)].join(' ') }))

  return {
    generatedAt: new Date().toISOString(),
    facts: {
      profile: {
        goal: S.profile?.goal || null,
        experience: S.profile?.experience || null,
        plannedSessionsPerWeek: S.profile?.daysPerWeek || null,
        preferredSessionMinutes: S.profile?.sessionMinutes || null,
        heightCm: S.profile?.heightCm || null,
        equipment: S.profile?.equipment || [],
      },
      totalWorkoutsLogged: (S.workouts || []).length,
      routines: (S.routines || []).map(r => ({
        name: r.name,
        exercises: (r.ex || []).map(x => {
          const ex = EXIDX[x.id]
          return {
            name: ex?.n || x.id,
            prescription: `${x.sets}×${x.reps ?? (x.sec != null ? x.sec + 's' : '?')}${x.weight > 0 ? ` @ ${x.weight}${unit}` : ''}`,
            progressionPolicy: x.prog || 'routine default',
            ...(x.rirTarget != null ? { targetRIR: x.rirTarget } : {}),
            ...(x.rest ? { restSeconds: x.rest } : {}),
          }
        }),
      })),
      recentWorkouts,
      bodyweightLogTail: (S.bodyweight || []).slice(-6).map(b => ({ date: b.d, weight: b.w })),
    },
    computed: {
      unit,
      sessionsPerWeekRecent: summary.perWeek,
      averageSessionMinutes: summary.avgDurationMin,
      volumeLast7Days: Math.round(summary.weekVolume),
      volumeAvgPerWeek8w: summary.avgWeekVolume,
      prSessionsLast30Days: summary.prs30,
      improving: momentum.improving.slice(0, 5).map(x => ({ exercise: x.name, changePct: x.deltaPct })),
      stalled: momentum.stalled.slice(0, 5).map(x => ({ exercise: x.name, daysSince: x.daysSince })),
      suggestionsFromRules: suggestions,
      bodyweightTrend30d: (() => {
        const bw = (S.bodyweight || []).filter(b => (b.t || new Date(b.d + 'T12:00:00').getTime()) > now - 30 * 86400000)
        return bw.length > 1 ? Math.round((bw[bw.length - 1].w - bw[0].w) * 10) / 10 : null
      })(),
    },
  }
}

/* ---------------------------- prompt construction ---------------------------- */

// The guardrails the spec demands, stated to the model in terms it can follow:
// recorded facts vs calculated metrics vs recommendations vs uncertainty — labelled,
// never mixed, never invented, never medical.
export function systemPrompt(langName) {
  return [
    'You are the coach inside MiGym, a self-hosted fitness tracker. You answer questions about ONE user’s logged training.',
    'You will receive a JSON object with two sections: "facts" (what the user actually recorded) and "computed" (metrics our deterministic code derived from those facts).',
    'Rules you must never break:',
    '1. Use ONLY the data provided. If something is not in there, say you don’t have that information.',
    '2. Never invent workouts, sets, weights, dates or measurements.',
    '3. Structure every answer with these labels when they apply:',
    '   Recorded facts:, Calculated:, Recommendation:, Uncertainty:.',
    '4. You are not a doctor. No medical diagnoses, no injury advice, no diet prescriptions. Suggest a professional for anything medical.',
    '5. Deterministic rule outputs ("suggestionsFromRules") are the authority on load progression. You may explain them, never contradict them.',
    '6. Be concrete and short. Prefer numbers already present over vague advice.',
    langName ? `Answer in ${langName}.` : '',
  ].filter(Boolean).join('\n')
}

export function buildMessages(context, question, langName) {
  return [
    { role: 'system', content: systemPrompt(langName) },
    { role: 'user', content: 'My training data:\n' + JSON.stringify(context) },
    { role: 'user', content: question },
  ]
}

/* ---------------------------- transport ---------------------------- */

export function chatUrl(baseUrl) {
  return String(baseUrl || '').replace(/\/+$/, '') + '/chat/completions'
}

/**
 * One non-streaming completion against an OpenAI-compatible endpoint.
 * Throws Error with a user-presentable message; never logs or embeds the API key
 * anywhere except the Authorization header of this single request.
 */
export async function askCoach(cfg, messages, signal) {
  if (!coachConfigured(cfg)) throw new Error('Coach is not configured.')
  let res
  try {
    res = await fetch(chatUrl(cfg.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cfg.key ? { Authorization: 'Bearer ' + cfg.key } : {}),
      },
      body: JSON.stringify({ model: cfg.model, messages, temperature: 0.3 }),
      signal,
    })
  } catch (e) {
    throw new Error(e.name === 'AbortError' ? 'Request cancelled.' : 'Could not reach the coach endpoint.', { cause: e })
  }
  if (!res.ok) {
    let detail = ''
    try { detail = (await res.json())?.error?.message || '' } catch { /* opaque body */ }
    throw new Error(`Endpoint answered ${res.status}${detail ? ': ' + detail.slice(0, 200) : ''}`)
  }
  let data
  try { data = await res.json() } catch { throw new Error('Endpoint returned malformed JSON.') }
  const text = data?.choices?.[0]?.message?.content
  if (typeof text !== 'string' || !text.trim()) throw new Error('Endpoint returned no answer text.')
  return text.trim()
}
