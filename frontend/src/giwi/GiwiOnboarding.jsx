// Giwi first-launch onboarding (docs/ONBOARDING.md).
// Question → reaction → next question, over the real design system. Everything commits
// atomically at the confirmation step: profile fields + the first weigh-in.
import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { normalizeProfile, GOALS, GOAL_LABEL } from '../lib/profile.js'
import { todayISO, fmtNum } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Giwi from './Giwi.jsx'
import { DIALOGUE } from './dialogue.js'
import { completeOnboarding } from './flags.js'
import { Button, TextField } from './../components/ui.jsx'

const STEPS = ['welcome', 'name', 'age', 'weight', 'height', 'goal', 'confirm']

export default function GiwiOnboarding({ onDone }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState({ name: '', ageYears: '', weight: '', heightCm: '', goal: '' })
  const set = patch => setDraft(d => ({ ...d, ...patch }))

  const next = () => setStep(i => Math.min(i + 1, STEPS.length - 1))
  const commit = () => {
    update(s => {
      s.profile = normalizeProfile({
        ...s.profile,
        name: draft.name,
        ageYears: draft.ageYears,
        heightCm: draft.heightCm,
        goal: draft.goal,
      })
      s.bodyweight = [...(s.bodyweight || []), { d: todayISO(), w: Number(draft.weight) }]
    })
    completeOnboarding()
    setStep(STEPS.length)            // "ready" closing screen
  }

  const bubble = (key, args) => <p className="giwi-line">{t(DIALOGUE[key], ...(args || []))}</p>

  return (
    <div className="narrow giwi-screen">
      <Giwi state={step >= STEPS.length ? 'celebrate' : ['name', 'age'].includes(STEPS[step]) ? 'thinking' : 'welcome'} size={110} />
      <div className="giwi-bubble" style={{ margin: '10px auto 16px', position: 'relative' }}>
        {step === 0 && <>
          <h2 className="t-h1">{t('Welcome to MiGym')}</h2>
          {bubble('welcomeLine')}
        </>}

        {step === 1 && <>
          {bubble('askName')}
          <TextField aria-label={t(DIALOGUE.yourName)} placeholder={t(DIALOGUE.yourName)}
            value={draft.name} maxLength={60}
            onChange={e => set({ name: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter' && draft.name.trim()) next() }} />
          {draft.name.trim() && <div className="small dim" style={{ marginTop: 6 }}>{t('niceToMeet', draft.name.trim())}</div>}
        </>}

        {step === 2 && <>
          {bubble('askAge')}
          <TextField inputMode="numeric" aria-label={t(DIALOGUE.age)} placeholder="30"
            value={String(draft.ageYears ?? '')}
            onChange={e => set({ ageYears: e.target.value.replace(/[^0-9]/g, '') })}
            onKeyDown={e => { if (e.key === 'Enter') next() }} />
        </>}

        {step === 3 && <>
          {bubble('askWeight')}
          <TextField inputMode="decimal" aria-label={t(DIALOGUE.currentWeight)}
            placeholder={S.unit === 'lb' ? '180' : '80'}
            value={String(draft.weight ?? '')}
            onChange={e => set({ weight: e.target.value.replace(',', '.') })}
            onKeyDown={e => { if (e.key === 'Enter') next() }} />
          <div className="dim small" style={{ marginTop: 4 }}>{S.unit}</div>
        </>}

        {step === 4 && <>
          {bubble('askHeight')}
          <TextField inputMode="decimal" aria-label={t(DIALOGUE.height)} placeholder="176"
            value={String(draft.heightCm ?? '')}
            onChange={e => set({ heightCm: e.target.value.replace(/[^0-9.]/g, '') })}
            onKeyDown={e => { if (e.key === 'Enter') next() }} />
          <div className="dim small" style={{ marginTop: 4 }}>cm</div>
        </>}

        {step === 5 && <>
          {bubble('askGoal')}
          <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
            {GOALS.map(g => (
              <Button key={g} variant={draft.goal === g ? 'primary' : 'plain'}
                onClick={() => set({ goal: g })}>{t(GOAL_LABEL[g])}</Button>
            ))}
          </div>
        </>}

        {step === 6 && <>
          {bubble('perfectLine')}
          <div className="card small" style={{ textAlign: 'left', margin: '10px 0' }}>
            <div><b>{draft.name}</b></div>
            <div className="dim">{fmtNum(Number(draft.ageYears))} · {fmtNum(Number(draft.weight))} {S.unit} · {fmtNum(Number(draft.heightCm))} cm</div>
            <div className="dim">{t(GOAL_LABEL[draft.goal])}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={() => setStep(1)}>{t(DIALOGUE.editProfile)}</Button>
            <Button variant="primary" icon="check" onClick={commit}>{t(DIALOGUE.confirmProfile)}</Button>
          </div>
        </>}

        {step === STEPS.length && <>
          {bubble('tourLine')}
          <div className="dim small" style={{ marginTop: 4 }}>{t('You can redo this tour anytime from Settings.')}</div>
          <div style={{ height: 10 }} />
          <Button variant="primary" icon="check" onClick={() => onDone?.()}>{t(DIALOGUE.confirmProfile)}</Button>
        </>}
      </div>

      {/* step controls */}
      {step > 0 && step < STEPS.length && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span className="dim small">{step} / {STEPS.length - 1}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 1 && <Button onClick={() => setStep(i => i - 1)}>{t('Back')}</Button>}
            <button className="btn ghost dim" onClick={() => { completeOnboarding(); onDone?.() }}>{t('Skip')}</button>
            {(step === 2 || step === 3 || step === 4 || step === 5) &&
              <Button variant="primary" onClick={next} disabled={
                (step === 2 && !(Number(draft.ageYears) >= 10 && Number(draft.ageYears) <= 100)) ||
                (step === 3 && !(Number(draft.weight) > 0)) ||
                (step === 4 && !(Number(draft.heightCm) >= 50)) ||
                (step === 5 && !draft.goal)
              }>{t(DIALOGUE.start)}</Button>}
          </div>
        </div>
      )}
    </div>
  )
}
