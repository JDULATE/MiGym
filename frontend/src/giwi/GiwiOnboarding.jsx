// Giwi first-launch onboarding — V2 cinematic scene.
// One question per screen over a fixed navy canvas: display-type question, chip answers,
// giant inputs, thin progress. Logic identical to the original flow (incl. supplements
// step that seeds real items on commit). q()/nav() are render helpers, NOT components.
import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { normalizeProfile, GOALS, GOAL_LABEL, EXPERIENCE, EXPERIENCE_LABEL } from '../lib/profile.js'
import { todayISO, fmtNum } from '../lib/format.js'
import { t, LANGS, setLang, useLang } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import Giwi from './Giwi.jsx'
import { DIALOGUE } from './dialogue.js'
import { completeOnboarding } from './flags.js'
import './onboarding.css'

const STEPS = ['language', 'welcome', 'name', 'age', 'weight', 'height', 'goal', 'experience', 'days', 'supps', 'confirm']

const SUPP_ONBOARD_PRESET = {
  creatine: { sched: 'daily', dose: '5 g', time: '09:00' },
  protein: { sched: 'training', dose: '1 scoop' },
  preworkout: { sched: 'training', dose: '1 dosis' },
  amino: { sched: 'training', dose: '1 scoop' },
}
const SUPP_KINDS_LIST = ['creatine', 'protein', 'preworkout', 'amino', 'other']
const SUPP_LABEL = k => t(k.charAt(0).toUpperCase() + k.slice(1))

export default function GiwiOnboarding({ onDone }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const _lang = useLang()   // re-render on language switch mid-flow (step 0)
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
      if (!s.supps) s.supps = { items: [] }
      let n = 0
      for (const kind of draft.suppsKinds) {
        n++
        const custom = kind === 'other'
        const preset = SUPP_ONBOARD_PRESET[kind] || {}
        s.supps.items.push({
          id: 'u' + Date.now().toString(36) + n,
          name: custom ? (draft.suppsCustom.trim() || 'Supplement') : SUPP_LABEL(kind),
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

  const valid = [
    true, true,
    !!draft.name.trim(),
    Number(draft.ageYears) >= 10 && Number(draft.ageYears) <= 100,
    Number(draft.weight) > 0,
    Number(draft.heightCm) >= 50,
    draft.goals.length > 0,
    !!draft.experience,
    Number(draft.daysPerWeek) >= 1,
    draft.suppsKinds.includes('other') ? !!draft.suppsCustom.trim() : true,
    true,
  ]
  const canNext = valid[step]
  const giwiState = step >= STEPS.length ? 'celebrate'
    : ['name', 'age', 'weight'].includes(STEPS[step]) ? 'thinking'
    : STEPS[step] === 'language' || STEPS[step] === 'welcome' ? 'welcome'
    : STEPS[step] === 'supps' ? 'point'
    : step === STEPS.indexOf('confirm') ? 'happy'
    : 'encourage'

  // render helpers (plain functions returning JSX — never used as components)
  const giwiNode = size => <div className="ob-giwi"><Giwi state={giwiState} size={size} /></div>
  const questionNode = (text, hint) => (<>
    <div className="ob-giwi"><Giwi state={giwiState} size={128} /></div>
    <h2 className="ob-q">{text}</h2>
    {hint && <div className="ob-hint">{hint}</div>}
  </>)
  const navNode = (onNext, nextLabel) => (
    <div className="ob-nav">
      <button className="ob-backbtn pressable" onClick={back}>{t('Back')}</button>
      <button className="ob-primary pressable" disabled={!canNext} onClick={onNext || next}>
        {nextLabel || t('Continue')}
      </button>
    </div>
  )

  return (
    <div className="ob">
      <div className="ob-top">
        <button className="ob-back" onClick={back}
          style={{ visibility: step > 0 && step < STEPS.length ? 'visible' : 'hidden' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon name="chevronLeft" size={14} /> {t('Back')}
          </span>
        </button>
        <button className="ob-skip" onClick={skipAll}
          style={{ visibility: step < STEPS.length ? 'visible' : 'hidden' }}>
          {t(DIALOGUE.skip)}
        </button>
      </div>
      <div className="ob-progress"><i style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} /></div>

      {/* language */}
      {step === 0 && <>
        {giwiNode(132)}
        <h2 className="ob-q">{t(DIALOGUE.askLang)}</h2>
        <div className="ob-body">
          <div className="ob-chips">
            {Object.entries(LANGS).map(([code, name]) => (
              <button key={code} className={'ob-chip' + (draft.lang === code ? ' on' : '')}
                onClick={() => { set({ lang: code }); setLang(code) }}>{name}</button>
            ))}
          </div>
        </div>
        <div className="ob-nav">
          <button className="ob-backbtn" onClick={skipAll}>{t(DIALOGUE.skip)}</button>
          <button className="ob-primary pressable" disabled={!draft.lang} onClick={next}>{t(DIALOGUE.start)}</button>
        </div>
      </>}

      {/* welcome */}
      {step === 1 && <>
        {giwiNode(140)}
        <h2 className="ob-done-title">{t('Welcome to MiGym')}</h2>
        <p className="ob-hint">{t(DIALOGUE.welcomeLine)}</p>
        <div className="ob-nav">
          <button className="ob-primary pressable" onClick={next}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {t(DIALOGUE.start)} <Icon name="sparkles" size={16} />
            </span>
          </button>
        </div>
      </>}

      {/* name */}
      {step === 2 && <>
        {questionNode(t(DIALOGUE.askName), draft.name.trim() ? t(DIALOGUE.niceToMeet, draft.name.trim()) : null)}
        <div className="ob-body">
          <input className="ob-input" value={draft.name} maxLength={60} autoFocus
            onChange={e => set({ name: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter' && canNext) next() }} />
        </div>
        {navNode(next)}
      </>}

      {/* age */}
      {step === 3 && <>
        {questionNode(t(DIALOGUE.askAge))}
        <div className="ob-body">
          <input className="ob-input" inputMode="numeric" placeholder="30" autoFocus
            value={String(draft.ageYears ?? '')}
            onChange={e => set({ ageYears: e.target.value.replace(/[^0-9]/g, '') })}
            onKeyDown={e => { if (e.key === 'Enter' && canNext) next() }} />
          <div className="ob-unit">{t(DIALOGUE.age)}</div>
        </div>
        {navNode(next)}
      </>}

      {/* weight */}
      {step === 4 && <>
        {questionNode(t(DIALOGUE.askWeight))}
        <div className="ob-body">
          <input className="ob-input" inputMode="decimal" autoFocus
            placeholder={S.unit === 'lb' ? '180' : '80'}
            value={String(draft.weight ?? '')}
            onChange={e => set({ weight: e.target.value.replace(',', '.') })}
            onKeyDown={e => { if (e.key === 'Enter' && canNext) next() }} />
          <div className="ob-unit">{S.unit}</div>
        </div>
        {navNode(next)}
      </>}

      {/* height */}
      {step === 5 && <>
        {questionNode(t(DIALOGUE.askHeight))}
        <div className="ob-body">
          <input className="ob-input" inputMode="decimal" placeholder="176" autoFocus
            value={String(draft.heightCm ?? '')}
            onChange={e => set({ heightCm: e.target.value.replace(/[^0-9.]/g, '') })}
            onKeyDown={e => { if (e.key === 'Enter' && canNext) next() }} />
          <div className="ob-unit">cm</div>
        </div>
        {navNode(next)}
      </>}

      {/* goals */}
      {step === 6 && <>
        {questionNode(t(DIALOGUE.askGoalMulti))}
        <div className="ob-body">
          <div className="ob-chips">
            {GOALS.map(g => (
              <button key={g} className={'ob-chip' + (draft.goals.includes(g) ? ' on' : '')}
                onClick={() => set({
                  goals: draft.goals.includes(g) ? draft.goals.filter(x => x !== g) : [...draft.goals, g],
                })}>{t(GOAL_LABEL[g])}</button>
            ))}
          </div>
        </div>
        {navNode(next)}
      </>}

      {/* experience */}
      {step === 7 && <>
        {questionNode(t(DIALOGUE.askExperience))}
        <div className="ob-body">
          <div className="ob-chips">
            {EXPERIENCE.map(x => (
              <button key={x} className={'ob-chip' + (draft.experience === x ? ' on' : '')}
                onClick={() => { set({ experience: x }); next() }}>{t(EXPERIENCE_LABEL[x])}</button>
            ))}
          </div>
        </div>
        <div className="ob-nav">
          <button className="ob-backbtn pressable" onClick={back}>{t('Back')}</button>
        </div>
      </>}

      {/* days per week */}
      {step === 8 && <>
        {questionNode(t(DIALOGUE.askDays))}
        <div className="ob-body">
          <div className="ob-chips">
            {[1, 2, 3, 4, 5, 6, 7].map(n => (
              <button key={n} className={'ob-chip mini' + (Number(draft.daysPerWeek) === n ? ' on' : '')}
                onClick={() => { set({ daysPerWeek: n }); next() }}>{n}</button>
            ))}
          </div>
        </div>
        <div className="ob-nav">
          <button className="ob-backbtn pressable" onClick={back}>{t('Back')}</button>
        </div>
      </>}

      {/* supplements */}
      {step === 9 && <>
        {questionNode(t('Do you take any supplements?'), t('I’ll remind you every day.'))}
        <div className="ob-body">
          <div className="ob-chips">
            {SUPP_KINDS_LIST.map(kind => (
              <button key={kind} className={'ob-chip' + (draft.suppsKinds.includes(kind) ? ' on' : '')}
                onClick={() => {
                  const suppsKinds = draft.suppsKinds.includes(kind)
                    ? draft.suppsKinds.filter(x => x !== kind)
                    : [...draft.suppsKinds, kind]
                  if (kind === 'other') set({ suppsKinds, suppsCustom: '' })
                  else set({ suppsKinds })
                }}>{SUPP_LABEL(kind)}</button>
            ))}
          </div>
          {draft.suppsKinds.includes('other') && (
            <input className="ob-note" placeholder={t('Which one? (e.g. Omega 3)')}
              value={draft.suppsCustom} autoFocus
              onChange={e => set({ suppsCustom: e.target.value })} />
          )}
        </div>
        {navNode(next, draft.suppsKinds.length === 0 ? t('None for now') : undefined)}
      </>}

      {/* confirm */}
      {step === 10 && <>
        {questionNode(t(DIALOGUE.perfectLine))}
        <div className="ob-body">
          <div className="ob-summary">
            <b>{draft.name}</b><br />
            <span className="dim">
              {fmtNum(Number(draft.ageYears))} · {fmtNum(Number(draft.weight))} {S.unit} · {fmtNum(Number(draft.heightCm))} cm
            </span><br />
            <span className="dim">{draft.goals.map(g => t(GOAL_LABEL[g])).join(' · ')}</span><br />
            <span className="dim">{t(EXPERIENCE_LABEL[draft.experience])} · {t('{0} days/week', draft.daysPerWeek)}</span>
            {!!draft.suppsKinds.length && (
              <span className="dim" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="heart" size={12} />
                {draft.suppsKinds.map(k =>
                  k === 'other' && draft.suppsCustom.trim() ? draft.suppsCustom.trim() : SUPP_LABEL(k)
                ).join(' · ')}
              </span>
            )}
          </div>
        </div>
        {navNode(commit, t(DIALOGUE.confirmProfile))}
      </>}

      {/* done */}
      {step >= STEPS.length && <>
        {giwiNode(150)}
        <h2 className="ob-done-title">{t(DIALOGUE.tourLine)}</h2>
        <p className="ob-hint">{t('You can redo this tour anytime from Settings.')}</p>
        <div className="ob-nav">
          <button className="ob-primary pressable" onClick={() => onDone?.()}>{t(DIALOGUE.letsGo)}</button>
        </div>
      </>}
    </div>
  )
}
