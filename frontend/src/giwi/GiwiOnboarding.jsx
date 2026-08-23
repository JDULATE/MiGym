// Giwi first-launch onboarding (docs/ONBOARDING.md).
// Question → reaction → next question. Everything commits atomically at confirmation.
// Every step renders its own action button INSIDE the bubble — no separate controls area.
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
  const next = () => setStep(i => Math.min(i + 1, STEPS.length))
  const back = () => setStep(i => Math.max(i - 1, 0))

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
    setStep(STEPS.length)
  }

  const skipAll = () => { completeOnboarding(); onDone?.() }
  const bubble = (key, args) => <p className="giwi-line">{t(DIALOGUE[key], ...(args || []))}</p>

  // validation per step
  const valid = [
    true,                                                                                       // welcome
    !!draft.name.trim(),                                                                        // name
    Number(draft.ageYears) >= 10 && Number(draft.ageYears) <= 100,                              // age
    Number(draft.weight) > 0,                                                                   // weight
    Number(draft.heightCm) >= 50,                                                               // height
    !!draft.goal,                                                                               // goal
    true,                                                                                       // confirm
  ]

  return (
    <div className="narrow giwi-screen" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center', padding: '20px 16px calc(20px + var(--sab))' }}>
      <Giwi state={step >= STEPS.length ? 'celebrate' : ['name', 'age', 'weight'].includes(STEPS[step]) ? 'thinking' : step === STEPS.length - 1 ? 'happy' : 'welcome'} size={110} />

      <div className="giwi-bubble" style={{ margin: '12px auto 0', position: 'relative', width: '100%', maxWidth: 380 }}>
        {/* ---- welcome ---- */}
        {step === 0 && <>
          <h2 className="t-h1">{t('Welcome to MiGym')}</h2>
          {bubble('welcomeLine')}
          <div style={{ marginTop: 14 }}>
            <Button variant="primary" icon="sparkles" onClick={next}>{t(DIALOGUE.start)}</Button>
            <button className="btn ghost dim" style={{ marginLeft: 8 }} onClick={skipAll}>{t(DIALOGUE.skip)}</button>
          </div>
        </>}

        {/* ---- name ---- */}
        {step === 1 && <>
          {bubble('askName')}
          <TextField aria-label={t(DIALOGUE.yourName)} placeholder={t(DIALOGUE.yourName)}
            value={draft.name} maxLength={60} autoFocus
            onChange={e => set({ name: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter' && valid[1]) next() }} />
          {draft.name.trim() && <div className="small dim" style={{ marginTop: 6 }}>{t('niceToMeet', draft.name.trim())}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Button onClick={back}>{t('Back')}</Button>
            <Button variant="primary" disabled={!valid[1]} onClick={next}>{t('Continue')}</Button>
          </div>
        </>}

        {/* ---- age ---- */}
        {step === 2 && <>
          {bubble('askAge')}
          <TextField inputMode="numeric" aria-label={t(DIALOGUE.age)} placeholder="30" autoFocus
            value={String(draft.ageYears ?? '')}
            onChange={e => set({ ageYears: e.target.value.replace(/[^0-9]/g, '') })}
            onKeyDown={e => { if (e.key === 'Enter' && valid[2]) next() }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Button onClick={back}>{t('Back')}</Button>
            <Button variant="primary" disabled={!valid[2]} onClick={next}>{t('Continue')}</Button>
          </div>
        </>}

        {/* ---- weight ---- */}
        {step === 3 && <>
          {bubble('askWeight')}
          <TextField inputMode="decimal" aria-label={t(DIALOGUE.currentWeight)}
            placeholder={S.unit === 'lb' ? '180' : '80'} autoFocus
            value={String(draft.weight ?? '')}
            onChange={e => set({ weight: e.target.value.replace(',', '.') })}
            onKeyDown={e => { if (e.key === 'Enter' && valid[3]) next() }} />
          <div className="dim small" style={{ marginTop: 4 }}>{S.unit}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Button onClick={back}>{t('Back')}</Button>
            <Button variant="primary" disabled={!valid[3]} onClick={next}>{t('Continue')}</Button>
          </div>
        </>}

        {/* ---- height ---- */}
        {step === 4 && <>
          {bubble('askHeight')}
          <TextField inputMode="decimal" aria-label={t(DIALOGUE.height)} placeholder="176" autoFocus
            value={String(draft.heightCm ?? '')}
            onChange={e => set({ heightCm: e.target.value.replace(/[^0-9.]/g, '') })}
            onKeyDown={e => { if (e.key === 'Enter' && valid[4]) next() }} />
          <div className="dim small" style={{ marginTop: 4 }}>cm</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Button onClick={back}>{t('Back')}</Button>
            <Button variant="primary" disabled={!valid[4]} onClick={next}>{t('Continue')}</Button>
          </div>
        </>}

        {/* ---- goal ---- */}
        {step === 5 && <>
          {bubble('askGoal')}
          <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
            {GOALS.map(g => (
              <Button key={g} variant={draft.goal === g ? 'primary' : 'plain'}
                onClick={() => { set({ goal: g }); next() }}>{t(GOAL_LABEL[g])}</Button>
            ))}
          </div>
          <div style={{ marginTop: 10 }}>
            <Button onClick={back}>{t('Back')}</Button>
          </div>
        </>}

        {/* ---- confirm ---- */}
        {step === 6 && <>
          {bubble('perfectLine')}
          <div className="card small" style={{ textAlign: 'left', margin: '10px 0' }}>
            <div><b>{draft.name}</b></div>
            <div className="dim">{t(DIALOGUE.years)}: {fmtNum(Number(draft.ageYears))} · {t(DIALOGUE.currentWeight)}: {fmtNum(Number(draft.weight))} {S.unit} · {t('Height')}: {fmtNum(Number(draft.heightCm))} cm</div>
            <div className="dim">{t('Goal')}: {t(GOAL_LABEL[draft.goal])}</div>
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

      {/* skip link — secondary, always available except on the final screen */}
      {step > 0 && step < STEPS.length && (
        <button className="btn ghost dim" style={{ marginTop: 12 }} onClick={skipAll}>{t(DIALOGUE.skip)}</button>
      )}
    </div>
  )
}
