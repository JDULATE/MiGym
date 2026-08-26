// Giwi first-launch onboarding (docs/ONBOARDING.md).
// Language first (comfort), then friendly questions, multi-select goals.
// Every step has its action button INSIDE the bubble. Commits atomically at confirm.
import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { normalizeProfile, GOALS, GOAL_LABEL, EXPERIENCE, EXPERIENCE_LABEL } from '../lib/profile.js'
import { todayISO, fmtNum } from '../lib/format.js'
import { t, LANGS, setLang, getLang, dateLocale } from '../lib/i18n.js'
import Giwi from './Giwi.jsx'
import { DIALOGUE } from './dialogue.js'
import { completeOnboarding } from './flags.js'
import { Button, TextField, Check } from './../components/ui.jsx'

const STEPS = ['language', 'welcome', 'name', 'age', 'weight', 'height', 'goal', 'experience', 'days', 'supps', 'confirm']

// Presets applied per selected kind when the profile commits (lib/supplements.js).
const SUPP_ONBOARD_PRESET = {
  creatine: { sched: 'daily', dose: '5 g', time: '09:00' },
  protein: { sched: 'training', dose: '1 scoop' },
  preworkout: { sched: 'training', dose: '1 dosis' },
  amino: { sched: 'training', dose: '1 scoop' },
}
const SUPP_KINDS_LIST = ['creatine', 'protein', 'preworkout', 'amino', 'other']

export default function GiwiOnboarding({ onDone }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState({
    name: '', ageYears: '', weight: '', heightCm: '', goal: '', goals: [],
    experience: '', daysPerWeek: '', suppsKinds: [], suppsCustom: '',
  })
  const set = patch => setDraft(d => ({ ...d, ...patch }))
  const next = () => setStep(i => Math.min(i + 1, STEPS.length))
  const back = () => setStep(i => Math.max(i - 1, 0))

  const commit = () => {
    update(s => {
      s.profile = normalizeProfile({
        ...s.profile,
        name: draft.name,
        ageYears: draft.ageYears,
        heightCm: draft.heightCm,
        goal: draft.goals[0] || draft.goal || null,
        goals: draft.goals.length ? [...draft.goals] : (draft.goal ? [draft.goal] : []),
        experience: draft.experience,
        daysPerWeek: draft.daysPerWeek,
      })
      s.bodyweight = [...(s.bodyweight || []), { d: todayISO(), w: Number(draft.weight) }]
      s.lang = draft.lang || s.lang
      // supplements chosen during onboarding become real items with sensible presets
      if (!s.supps) s.supps = { items: [] }
      let n = 0
      for (const kind of draft.suppsKinds) {
        n++
        const custom = kind === 'other'
        const preset = SUPP_ONBOARD_PRESET[kind] || {}
        s.supps.items.push({
          id: 'u' + Date.now().toString(36) + n,
          name: custom
            ? (draft.suppsCustom.trim() || 'Supplement')
            : t(kind.charAt(0).toUpperCase() + kind.slice(1)),
          kind: custom ? 'other' : kind,
          dose: preset.dose || '', sched: preset.sched || 'daily',
          days: [], time: preset.time || '', log: {},
        })
      }
    })
    completeOnboarding()
    setStep(STEPS.length)
  }

  const skipAll = () => { completeOnboarding(); onDone?.() }
  const bubble = (key, args) => <p className="giwi-line" style={{ fontSize: 16, lineHeight: 1.5, marginBottom: 4 }}>{t(DIALOGUE[key], ...(args || []))}</p>

  const valid = [
    true,                                                                                     // language
    true,                                                                                     // welcome
    !!draft.name.trim(),                                                                      // name
    Number(draft.ageYears) >= 10 && Number(draft.ageYears) <= 100,                            // age
    Number(draft.weight) > 0,                                                                 // weight
    Number(draft.heightCm) >= 50,                                                             // height
    draft.goals.length > 0,                                                                   // goal
    !!draft.experience,                                                                       // experience
    Number(draft.daysPerWeek) >= 1,                                                           // days
    true,                                                                                     // confirm
  ]

  const canNext = valid[step]

  return (
    <div className="narrow giwi-screen" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center', padding: '20px 16px calc(20px + var(--sab))' }}>

      <Giwi state={step >= STEPS.length ? 'celebrate'
        : [STEPS.indexOf('name'), STEPS.indexOf('age'), STEPS.indexOf('weight')].includes(step) ? 'thinking'
        : step === STEPS.length - 1 ? 'happy'
        : step === 0 ? 'welcome'
        : 'encourage'} size={100} />

      <div className="giwi-bubble" style={{ margin: '12px auto 0', position: 'relative', width: '100%', maxWidth: 380 }}>
        {/* ---- language (always first — comfort before anything else) ---- */}
        {step === 0 && <>
          {bubble('askLang')}
          <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
            {Object.entries(LANGS).map(([code, name]) => (
              <Button key={code} variant={draft.lang === code ? 'primary' : 'plain'}
                onClick={() => { set({ lang: code }); setLang(code) }}>
                {name}
              </Button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Button variant="primary" disabled={!draft.lang} onClick={next}>{t(DIALOGUE.start)}</Button>
            <button className="btn ghost dim" onClick={skipAll}>{t(DIALOGUE.skip)}</button>
          </div>
        </>}

        {/* ---- welcome (after language, in their language now) ---- */}
        {step === 1 && <>
          <h2 className="t-h1">{t('Welcome to MiGym')}</h2>
          {bubble('welcomeLine')}
          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <Button variant="primary" icon="sparkles" onClick={next}>{t(DIALOGUE.start)}</Button>
            <button className="btn ghost dim" onClick={skipAll}>{t(DIALOGUE.skip)}</button>
          </div>
        </>}

        {/* ---- name ---- */}
        {step === 2 && <>
          {bubble('askName')}
          <TextField aria-label={t(DIALOGUE.yourName)} placeholder={t(DIALOGUE.yourName)}
            value={draft.name} maxLength={60} autoFocus
            onChange={e => set({ name: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter' && valid[2]) next() }} />
          {draft.name.trim() && <div className="small dim" style={{ marginTop: 6 }}>{t('niceToMeet', draft.name.trim())}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
            <Button onClick={back}>{t('Back')}</Button>
            <Button variant="primary" disabled={!canNext} onClick={next}>{t('Continue')}</Button>
          </div>
        </>}

        {/* ---- age ---- */}
        {step === 3 && <>
          {bubble('askAge')}
          <TextField inputMode="numeric" aria-label={t(DIALOGUE.age)} placeholder="30" autoFocus
            value={String(draft.ageYears ?? '')}
            onChange={e => set({ ageYears: e.target.value.replace(/[^0-9]/g, '') })}
            onKeyDown={e => { if (e.key === 'Enter' && valid[3]) next() }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
            <Button onClick={back}>{t('Back')}</Button>
            <Button variant="primary" disabled={!canNext} onClick={next}>{t('Continue')}</Button>
          </div>
        </>}

        {/* ---- weight ---- */}
        {step === 4 && <>
          {bubble('askWeight')}
          <TextField inputMode="decimal" aria-label={t(DIALOGUE.currentWeight)}
            placeholder={S.unit === 'lb' ? '180' : '80'} autoFocus
            value={String(draft.weight ?? '')}
            onChange={e => set({ weight: e.target.value.replace(',', '.') })}
            onKeyDown={e => { if (e.key === 'Enter' && valid[4]) next() }} />
          <div className="dim small" style={{ marginTop: 4 }}>{S.unit}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
            <Button onClick={back}>{t('Back')}</Button>
            <Button variant="primary" disabled={!canNext} onClick={next}>{t('Continue')}</Button>
          </div>
        </>}

        {/* ---- height ---- */}
        {step === 5 && <>
          {bubble('askHeight')}
          <TextField inputMode="decimal" aria-label={t(DIALOGUE.height)} placeholder="176" autoFocus
            value={String(draft.heightCm ?? '')}
            onChange={e => set({ heightCm: e.target.value.replace(/[^0-9.]/g, '') })}
            onKeyDown={e => { if (e.key === 'Enter' && valid[5]) next() }} />
          <div className="dim small" style={{ marginTop: 4 }}>cm</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
            <Button onClick={back}>{t('Back')}</Button>
            <Button variant="primary" disabled={!canNext} onClick={next}>{t('Continue')}</Button>
          </div>
        </>}

        {/* ---- goal (multi-select) ---- */}
        {step === 6 && <>
          {bubble('askGoalMulti')}
          <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
            {GOALS.map(g => (
              <Button key={g} variant={draft.goals.includes(g) ? 'primary' : 'plain'}
                onClick={() => {
                  const goals = draft.goals.includes(g) ? draft.goals.filter(x => x !== g) : [...draft.goals, g]
                  set({ goals })
                }}>{t(GOAL_LABEL[g])}</Button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
            <Button onClick={back}>{t('Back')}</Button>
            <Button variant="primary" disabled={!canNext} onClick={next}>{t('Continue')}</Button>
          </div>
        </>}

        {/* ---- experience ---- */}
        {step === 7 && <>
          {bubble('askExperience')}
          <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
            {EXPERIENCE.map(x => (
              <Button key={x} variant={draft.experience === x ? 'primary' : 'plain'}
                onClick={() => { set({ experience: x }); next() }}>{t(EXPERIENCE_LABEL[x])}</Button>
            ))}
          </div>
          <div style={{ marginTop: 10 }}><Button onClick={back}>{t('Back')}</Button></div>
        </>}

        {/* ---- days per week ---- */}
        {step === 8 && <>
          {bubble('askDays')}
          <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
            {[1, 2, 3, 4, 5, 6, 7].map(n => (
              <Button key={n} variant={Number(draft.daysPerWeek) === n ? 'primary' : 'plain'}
                onClick={() => { set({ daysPerWeek: n }); next() }}>{t('{0} days/week', n)}</Button>
            ))}
          </div>
          <div style={{ marginTop: 10 }}><Button onClick={back}>{t('Back')}</Button></div>
        </>}

        {/* ---- supplements (optional multi-select + custom) ---- */}
        {step === 9 && <>
          {bubble('askSupps')}
          <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
            {SUPP_KINDS_LIST.map(kind => (
              <Button key={kind} variant={draft.suppsKinds.includes(kind) ? 'primary' : 'plain'}
                onClick={() => {
                  const suppsKinds = draft.suppsKinds.includes(kind)
                    ? draft.suppsKinds.filter(x => x !== kind)
                    : [...draft.suppsKinds, kind]
                  if (kind === 'other') set({ suppsKinds, suppsCustom: '' })
                  else set({ suppsKinds })
                }}>{t(kind.charAt(0).toUpperCase() + kind.slice(1))}</Button>
            ))}
            {draft.suppsKinds.includes('other') && (
              <TextField placeholder={t('Which one? (e.g. Omega 3)')} value={draft.suppsCustom}
                onChange={e => set({ suppsCustom: e.target.value })} autoFocus />
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {draft.suppsKinds.length === 0 && (
              <Button variant="primary" onClick={next}>{t('None for now')}</Button>
            )}
            {!!draft.suppsKinds.length && (
              <Button variant="primary" onClick={next}>{t('Continue')}</Button>
            )}
            <Button onClick={back}>{t('Back')}</Button>
          </div>
        </>}

        {/* ---- confirm ---- */}
        {step === 10 && <>
          {bubble('perfectLine')}
          <div className="card small" style={{ textAlign: 'left', margin: '10px 0' }}>
            <div><b>{draft.name}</b></div>
            <div className="dim">
              {t(DIALOGUE.years)}: {fmtNum(Number(draft.ageYears))} · {t(DIALOGUE.currentWeight)}: {fmtNum(Number(draft.weight))} {S.unit} · {t('Height')}: {fmtNum(Number(draft.heightCm))} cm
            </div>
            <div className="dim">
              {draft.goals.map(g => t(GOAL_LABEL[g])).join(' · ')}
            </div>
            {draft.experience && <div className="dim">{t(EXPERIENCE_LABEL[draft.experience])}</div>}
            {draft.daysPerWeek && <div className="dim">{t('{0} days/week', draft.daysPerWeek)}</div>}
            {!!draft.suppsKinds.length && (
              <div className="dim">
                {t('Supplements')}: {draft.suppsKinds.map(k =>
                  k === 'other' && draft.suppsCustom.trim()
                    ? draft.suppsCustom.trim()
                    : t(k.charAt(0).toUpperCase() + k.slice(1))
                ).join(' · ')}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={back}>{t('Back')}</Button>
            <Button variant="primary" icon="check" onClick={commit}>{t(DIALOGUE.confirmProfile)}</Button>
          </div>
        </>}

        {/* ---- done / celebrate ---- */}
        {step >= STEPS.length && <>
          {bubble('tourLine')}
          <div className="dim small" style={{ marginTop: 4 }}>{t('You can redo this tour anytime from Settings.')}</div>
          <div style={{ height: 10 }} />
          <Button variant="primary" icon="check" onClick={() => onDone?.()}>{t(DIALOGUE.letsGo)}</Button>
        </>}
      </div>

      {/* skip link */}
      {step > 0 && step < STEPS.length && (
        <button className="btn ghost dim" style={{ marginTop: 12 }} onClick={skipAll}>{t(DIALOGUE.skip)}</button>
      )}
    </div>
  )
}
