import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, DEF, hasData } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { ACCENTS, todayISO, localTZ, fmtNum } from '../lib/format.js'
import { effortOf } from '../lib/history.js'
import { EQUIPMENT, EXPERIENCE, GOALS, MEASUREMENT_KEYS, latestMeasurement, normalizeMeasurements, normalizeProfile, profileSummary } from '../lib/profile.js'
import { api, webauthnOK, passkeyLogin, passkeyRegister, IS_ANDROID } from '../lib/api.js'
import { pushSupported, enablePush, disablePush, sendTestPush } from '../lib/push.js'
import { wakeLockSupported } from '../lib/wakelock.js'
import { t, LANGS, INSTR_LANGS } from '../lib/i18n.js'
import { DEMO } from '../lib/demo.js'
import { MOBILE, shareExport, syncReminder } from '../lib/mobile.js'
import { loadStarterPlan, confirmSheet, importFromApp } from '../sheets.jsx'
import { coachConfigured, loadCoachCfg, saveCoachCfg } from '../lib/coach.js'
import Icon from '../components/Icon.jsx'
import { Section, Row, SelectRow, Switch, Segmented, Button, TextField, TextArea, NumberField } from '../components/ui.jsx'

export default function Settings() {
  const nav = useNavigate()
  const user = useStore(s => s.user)
  const S = useStore(s => s.S)
  const profile = normalizeProfile(S.profile)
  const measurements = normalizeMeasurements(S.measurements)
  const { update, replaceState, setUser, pullState, pushState, signOut, signOutAll, resetDemo } = useStore()
  const toast = useUI(s => s.toast)
  const fileRef = useRef(null)
  const importRef = useRef(null)
  const wakeOK = wakeLockSupported()

  const doExport = async () => {
    const json = JSON.stringify(S, null, 2)
    const name = 'migym-backup-' + todayISO() + '.json'
    // WKWebView can't download blob URLs — the native build hands the file to the share sheet.
    if (MOBILE) {
      try { await shareExport(json, name); toast(t('Backup exported')) } catch (e) { /* share sheet dismissed */ }
      return
    }
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href)
    toast(t('Backup exported'))
  }
  const doImport = ev => {
    const f = ev.target.files[0]; if (!f) return
    const rd = new FileReader()
    rd.onload = () => {
      try {
        const data = JSON.parse(rd.result)
        if (!data.workouts || !data.routines) throw new Error('not a MiGym backup')
        confirmSheet({ title: t('Import backup?'), message: t('This replaces all current data with the backup file.'), confirmText: t('Import'), danger: true, onConfirm: () => { replaceState(Object.assign(JSON.parse(JSON.stringify(DEF)), data), true); toast(t('Backup imported')) } })
      } catch (e) { toast(t('Import failed: {0}', e.message)) }
    }
    rd.readAsText(f)
  }
  const signInHere = async () => {
    try { const u = await passkeyLogin(); setUser(u); await pullState(); toast(t('Welcome back, {0}', u.name)) }
    catch (e) { if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') toast(e.message || t('Sign-in failed')) }
  }
  const registerHere = () => useUI.getState().openSheet(close => <RegisterInline close={close} setUser={setUser} pushState={pushState} pullState={pullState} toast={toast} />)
  // Ends the profile's sessions on every device — this one included, so on success it lands in
  // the same place as the plain sign-out above (home, local data cleared). On failure nothing
  // local is touched: still signed in here, and say so rather than leaving a half-signed-out app.
  const signOutEverywhere = () => confirmSheet({
    title: t('Sign out everywhere?'),
    message: t('Signs this profile out on every device, including this one. Your passkeys keep working — sign in with them again anytime.'),
    confirmText: t('Sign out everywhere'), danger: true,
    onConfirm: async () => {
      try { await signOutAll(); nav('/home'); toast(t('Signed out on all devices')) }
      catch (e) { toast(t('Could not sign out everywhere — you are still signed in.')) }
    },
  })

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/home')} aria-label={t('Home')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 10 }}><h1>{t('Settings')}</h1></div>
    </div>

    {/* ---------- sync & backup (MiGym phase 10) ----------
        Local-first: the base always lives on this device. Linking a server profile is
        optional — it only adds sync and a security copy for device changes. Unlinking
        never touches the local data. */}
    <Section title={t('Sync & backup')} footer={user ? t('Your base lives on this device; the linked profile keeps a synced copy.') : t('Everything already works without an account. Link one only to keep a synced copy for new devices.')}>
      {MOBILE ? <>
        <Row icon="lock" iconTint="var(--acc)" title={t('All data stays on this phone')} subtitle={t('No account, no cloud — back it up anytime with Export below.')} />
      </> : DEMO ? <>
        <Row icon="sparkles" iconTint="var(--acc)" title={t('You’re in the demo')} subtitle={t('Example data, stored only in this browser — change anything you like.')} />
        <Row icon="reset" iconTint="var(--blue)" title={t('Reset demo data')} accessory="chevron"
          onClick={() => confirmSheet({ title: t('Reset demo data?'), message: t('Puts the example plan, workouts and weigh-ins back the way they started.'), confirmText: t('Reset'), onConfirm: () => { resetDemo(); nav('/home'); toast(t('Demo data reset')) } })} />
      </> : user ? <>
        <Row icon="personCircle" iconTint="var(--grey)" title={user.name} subtitle={t('Linked with passkey — every change syncs to this profile.')} />
        {user.admin && <Row icon="wrench" iconTint="var(--indigo)" title={t('Admin dashboard')} accessory="chevron" onClick={() => nav('/admin')} />}
        <Row icon="signOut" iconTint="var(--red)" title={t('Unlink from server')} danger onClick={() => confirmSheet({
          title: t('Unlink from server?'),
          message: t('A final backup is pushed first. Your plan, workouts and history stay on this device.'),
          confirmText: t('Unlink'), danger: true,
          onConfirm: () => { signOut(); toast(t('Device unlinked — your data stayed here')) },
        })} />
        <Row icon="shield" iconTint="var(--red)" title={t('End all sessions')} subtitle={t('Signs this profile out on all your other devices too.')} danger onClick={signOutEverywhere} />
      </> : webauthnOK() ? <>
        <Row icon="personCircle" iconTint="var(--acc)" title={t('Create a server backup profile')} subtitle={t('Keeps a synced copy for new devices — with passkeys, no passwords.')} accessory="chevron" onClick={registerHere} />
        <Row icon="person" iconTint="var(--blue)" title={t('Link to an existing profile')} accessory="chevron" onClick={signInHere} />
      </> : (
        <Row icon="lock" iconTint="var(--grey)" title={t('Passkeys not supported in this browser.')} />
      )}
    </Section>
    {!user && !DEMO && !MOBILE && webauthnOK() && <p className="sect-f" style={{ marginTop: -18, marginBottom: 22 }}>{t('Local-first: nothing leaves this device unless you link a server above.')}</p>}

    {/* ---------- fitness profile (MiGym phase 2) ----------
        Structured facts about the person training — consumed by nothing yet beyond
        this screen, but shaped so progression/analytics/coaching features can read
        them without re-asking. Purely descriptive: no medical interpretation. */}
    <Section title={t('Fitness profile')}>
      <Row icon="personCircle" iconTint="var(--blue)"
        title={profile.name || t('Set up your fitness profile')}
        subtitle={profileSummary(profile) || t('Goal, experience, equipment — what later features build on.')}
        accessory="chevron" onClick={() => openIdentitySheet(profile)} />
      <SelectRow icon="target" iconTint="var(--purple)" title={t('Training goal')}
        value={profile.goal || ''}
        onChange={v => update(s => { s.profile = normalizeProfile({ ...s.profile, goal: v || null }) })}
        options={[{ value: '', label: t('Not set') }, ...GOALS.map(g => ({ value: g, label: t(GOAL_LABEL[g]) }))]} />
      <SelectRow icon="chart" iconTint="var(--mint)" title={t('Experience level')}
        value={profile.experience || ''}
        onChange={v => update(s => { s.profile = normalizeProfile({ ...s.profile, experience: v || null }) })}
        options={[{ value: '', label: t('Not set') }, ...EXPERIENCE.map(x => ({ value: x, label: t(EXPERIENCE_LABEL[x]) }))]} />
      <SelectRow icon="calendar" iconTint="var(--orange)" title={t('Days per week')}
        value={profile.daysPerWeek || ''}
        onChange={v => update(s => { s.profile = normalizeProfile({ ...s.profile, daysPerWeek: v || null }) })}
        options={[{ value: '', label: t('Not set') }, ...[1, 2, 3, 4, 5, 6, 7].map(n => ({ value: n, label: t('{0} days/week', n) }))]} />
      <SelectRow icon="timer" iconTint="var(--teal)" title={t('Session length')}
        value={profile.sessionMinutes || ''}
        onChange={v => update(s => { s.profile = normalizeProfile({ ...s.profile, sessionMinutes: v || null }) })}
        options={[{ value: '', label: t('Not set') }, ...[15, 30, 45, 60, 75, 90, 120].map(n => ({ value: n, label: t('{0} min', n) }))]} />
      <Row icon="dumbbell" iconTint="var(--yellow)" title={t('Available equipment')}
        subtitle={t('Used to match exercises to what you can train with.')}
        value={profile.equipment.length ? t('{0} selected', profile.equipment.length) : null}
        accessory="chevron" onClick={() => openEquipmentSheet(profile)} />
    </Section>

    {/* ---------- body: height + append-only tape measurements ---------- */}
    <Section title={t('Body')}>
      <Row icon="figureStrength" iconTint="var(--teal)" title={t('Height')}>
        <span className="stp"><span className="val">
          <NumberField value={profile.heightCm} nullable decimal={false}
            onChange={v => update(s => { s.profile = normalizeProfile({ ...s.profile, heightCm: v }) })} />
          <i>cm</i>
        </span></span>
      </Row>
      <Row icon="clipboard" iconTint="var(--pink)" title={t('Measurements')}
        subtitle={measurements.length ? null : t('Neck, waist, arms — logged over time, never overwritten.')}
        value={measurements.length ? t('{0} readings', measurements.length) : null}
        accessory="chevron" onClick={() => openMeasurementsSheet(measurements)} />
    </Section>

    {/* ---------- general ---------- */}
    <Section title={t('General')} footer={t('Note: switching units only changes the label — logged numbers are not converted.')}>
      <SelectRow
        icon="globe" iconTint="var(--blue)" title={t('Language')}
        value={S.lang || 'en'} onChange={v => update(s => { s.lang = v })}
        options={Object.entries(LANGS).map(([k, name]) => ({
          value: k, label: name,
          subtitle: INSTR_LANGS.includes(k) ? null : t("Exercise instructions aren't available in this language yet — they stay in English."),
        }))}
      />
      <Row icon="scale" iconTint="var(--teal)" title={t('Weight unit')}>
        <Segmented className="seg-inline"
          options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]}
          value={S.unit} onChange={v => update(s => { s.unit = v })} />
      </Row>
    </Section>

    {/* ---------- during a workout ---------- */}
    <Section title={t('During a workout')} footer={wakeOK ? t('The screen stays on while a workout is running, so you don’t have to unlock your phone between sets.') : null}>
      <SelectRow icon="timer" iconTint="var(--orange)" title={t('Rest timer')}
        value={S.restSec} onChange={v => update(s => { s.restSec = v })}
        options={[60, 90, 120, 150, 180].map(v => ({ value: v, label: v + 's' }))} />
      {(wakeOK || !MOBILE) && (
        <Row icon="sun" iconTint="var(--yellow)" title={t('Keep screen awake')}
          subtitle={wakeOK ? null : t('Not supported in this browser.')}>
          <Switch checked={wakeOK && S.keepAwake !== false} disabled={!wakeOK}
            onChange={v => update(s => { s.keepAwake = v })} />
        </Row>
      )}
      <Row icon="bell" iconTint="var(--pink)" title={t('Sounds')}>
        <Switch checked={!!S.sound} onChange={v => update(s => { s.sound = v })} />
      </Row>
      {/* Two names for the same judgement, so the column asks in the scale you already think in.
          The (i) sits before the control — you read it on the way to the choice, not after it. */}
      <Row icon="target" iconTint="var(--purple)" title={t('Effort per set')}>
        <button className="helpbtn" aria-label={t('What are RIR and RPE?')} onClick={effortHelpSheet}><Icon name="info" /></button>
        <Segmented className="seg-inline"
          options={[{ value: 'none', label: t('Off') }, { value: 'rir', label: t('RIR') }, { value: 'rpe', label: t('RPE') }]}
          value={effortOf(S)} onChange={v => update(s => { s.effort = v; delete s.showRir })} />
      </Row>
    </Section>

    {(user || MOBILE) && <NotificationsCard S={S} update={update} toast={toast} />}
    <CoachCard />

    {/* ---------- appearance ---------- */}
    <Section title={t('Appearance')} footer={DEMO || MOBILE ? undefined : t('synced with your profile')}>
      <Row icon="moon" iconTint="var(--indigo)" title={t('Theme')}>
        <Segmented
          className="seg-inline"
          options={[{ value: 'dark', icon: 'moon', label: t('Dark') }, { value: 'light', icon: 'sun', label: t('Light') }]}
          value={S.theme === 'light' ? 'light' : 'dark'}
          onChange={v => update(s => { s.theme = v })}
        />
      </Row>
      {/* Purely how the muscle map is drawn — nothing else in the app reads this. */}
      <Row icon="figureStrength" iconTint="var(--teal)" title={t('Body diagram')}>
        <Segmented
          className="seg-inline"
          options={[{ value: 'male', label: t('Male') }, { value: 'female', label: t('Female') }]}
          value={S.body === 'female' ? 'female' : 'male'}
          onChange={v => update(s => { s.body = v })}
        />
      </Row>
      <div className="lrow" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12, paddingTop: 13, paddingBottom: 14 }}>
        <span className="lrow-t">{t('Accent color')}</span>
        <div className="swatches">
          {Object.entries(ACCENTS).map(([k, c]) => (
            <button key={k} className={'swatch' + ((S.accent || 'lime') === k ? ' on' : '')}
              style={{ background: c }} onClick={() => update(s => { s.accent = k })} aria-label={k} />
          ))}
        </div>
      </div>
    </Section>

    {/* ---------- data: fill it, bring things over, back it up, wipe it ---------- */}
    <Section title={t('Data')}>
      <Row icon="sparkles" iconTint="var(--acc)" title={t('Load a starter plan')} subtitle={t('Push / Pull / Legs, Upper / Lower or Full Body')} accessory="chevron" onClick={loadStarterPlan} />
      <Row icon="shuffle" iconTint="var(--teal)" title={t('Import from another app')}
        subtitle={t('FitNotes, Strong, Hevy — or body weight from Apple Health')}
        accessory="chevron" onClick={() => importRef.current.click()} />
      <Row icon="upload" iconTint="var(--blue)" title={t('Import backup')} accessory="chevron" onClick={() => fileRef.current.click()} />
      <Row icon="download" iconTint="var(--blue)" title={t('Export backup (JSON)')} accessory="chevron" onClick={doExport} />
      <Row icon="trash" iconTint="var(--red)" title={t('Reset everything')} danger onClick={() => confirmSheet({ title: t('Reset everything?'), message: t('Deletes your plan, workouts and body weight on this device. This cannot be undone.'), confirmText: t('Delete everything'), danger: true, onConfirm: () => { replaceState(JSON.parse(JSON.stringify(DEF)), true); nav('/home'); toast(t('All data reset')) } })} />
    </Section>
    <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={doImport} />
    {/* Reset after reading so picking the same file twice still fires onChange. */}
    <input ref={importRef} type="file" accept=".csv,.xml,text/csv,text/xml" style={{ display: 'none' }}
      onChange={ev => { const f = ev.target.files[0]; if (f) importFromApp(f); ev.target.value = '' }} />

    {/* "Add to Home screen" makes no sense inside the native app */}
    {!MOBILE && <Section title={t('Tip')}>
      <Row icon="lightbulb" iconTint="var(--yellow)"
        title={IS_ANDROID ? t('In Chrome: ⋮ menu → Add to Home screen') : t('In Safari: Share → Add to Home Screen')}
        subtitle={t('to install MiGym as a full-screen app.') + ' ' + (user ? t('Your data syncs with your profile — sign in anywhere to see it.') : t('Guest data stays on this device — export a backup now and then!'))} />
    </Section>}

    <div className="dim small" style={{ textAlign: 'center', marginTop: 4, lineHeight: 1.6 }}>
      MiGym · {t('free & open source (AGPL v3)')}<br />
      <a href="https://github.com/DuarteSantos8/openGym" target="_blank" rel="noopener">source code</a> · based on openGym by Duarte Santos · exercise data: hasaneyldrm/exercises-dataset (CC)
    </div>
  </div>
}

// The whole point is that the two scales are one judgement counted from opposite ends, and a
// paragraph is a bad way to say that — the conversion table shows it in one look. Reading down
// a column is the answer to "what do I put here", so the numbers get their own aligned columns.
const EFFORT_ROWS = [
  ['0', '10', 'Nothing left — went to failure'],
  ['1', '9', 'One more rep in the tank'],
  ['2', '8', 'Two more reps'],
  ['3', '7', 'Three more reps'],
  ['4+', '≤6', 'Easy — warm-up territory'],
]
// RIR 2 / RPE 8: the row a working set usually lands on — the anchor the others are read
// against. Not where the stepper starts; + walks up from the bottom of the scale.
const EFFORT_TYPICAL = 2

function effortHelpSheet() {
  useUI.getState().openSheet(close => <>
    <h3>{t('Effort per set')}</h3>
    <div className="muted small" style={{ lineHeight: 1.5 }}>
      {t('How hard a set was, logged next to weight and reps. Two scales for the same judgement, counted from opposite ends.')}
    </div>
    <div className="efftbl">
      <div className="r hd"><span className="n">{t('RIR')}</span><span className="n">{t('RPE')}</span><span className="f">{t('How it felt')}</span></div>
      {EFFORT_ROWS.map(([rir, rpe, feel], i) => (
        <div key={rir} className={'r' + (i === EFFORT_TYPICAL ? ' on' : '')}>
          <span className="n">{rir}</span><span className="n">{rpe}</span><span className="f">{t(feel)}</span>
        </div>
      ))}
    </div>
    <div className="dim small" style={{ lineHeight: 1.5, display: 'grid', gap: 8 }}>
      <div>{t('RIR counts the reps you left; RPE reads the same effort off a 10-point scale — so RPE ≈ 10 − RIR. Pick the one you already think in.')}</div>
      <div>{t('The highlighted row is where most working sets land. Sets you have already logged keep their own scale, and nothing else reads the value — progression and estimated 1RM are unaffected.')}</div>
    </div>
    <div style={{ height: 8 }} />
  </>)
}

/* ============================ fitness profile (MiGym phase 2) ============================ */

const GOAL_LABEL = {
  hypertrophy: 'Hypertrophy', strength: 'Strength', weight_loss: 'Weight loss',
  general: 'General fitness', performance: 'Performance'
}
const EXPERIENCE_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }
const MEASUREMENT_LABEL = {
  neck: 'Neck', shoulders: 'Shoulders', chest: 'Chest', waist: 'Waist',
  hips: 'Hips', upper_arm: 'Upper arm', thigh: 'Thigh', calf: 'Calf'
}
const MEASUREMENT_MAX_CM = 250

// Square-crop to ≤256 px JPEG — an avatar must never bloat the synced state blob
// (the server caps bodies at 5 MB; a full-size photo would eat a tenth of it).
async function fileToAvatar(file) {
  const bmp = await createImageBitmap(file)
  const side = Math.min(256, bmp.width, bmp.height)
  const sx = (bmp.width - side) / 2, sy = (bmp.height - side) / 2
  const cv = document.createElement('canvas')
  cv.width = side; cv.height = side
  cv.getContext('2d').drawImage(bmp, sx, sy, side, side, 0, 0, side, side)
  bmp.close?.()
  return cv.toDataURL('image/jpeg', 0.85)
}

// Name & photo & free-text preferences in one sheet — the identity half of the
// profile. Structured fields (goal/experience/…) live on the Settings rows.
function IdentitySheet({ close }) {
  const S = useStore.getState().S
  const profile = normalizeProfile(S.profile)
  const update = useStore.getState().update
  const toast = useUI(s => s.toast)
  const nameRef = useRef(null)
  const prefsRef = useRef(null)
  const photoRef = useRef(null)

  const savePhoto = async file => {
    try {
      const dataUrl = await fileToAvatar(file)
      update(s => { s.profile = normalizeProfile({ ...s.profile, image: dataUrl }) })
    } catch { toast(t('Could not read that image')) }
  }

  return <>
    <h3>{t('Name & photo')}</h3>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '6px 0 12px' }}>
      <span className="avatar" style={{ width: 64, height: 64 }}>
        {profile.image ? <img src={profile.image} alt="" /> : <Icon name="person" />}
      </span>
      <div style={{ display: 'grid', gap: 8 }}>
        <Button size="sm" icon="upload" onClick={() => photoRef.current.click()}>{t('Change photo')}</Button>
        {profile.image && <Button size="sm" icon="trash" onClick={() => { update(s => { s.profile = normalizeProfile({ ...s.profile, image: null }) }); toast(t('Photo removed')) }}>{t('Remove photo')}</Button>}
      </div>
      <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files[0]; if (f) savePhoto(f); e.target.value = '' }} />
    </div>
    <TextField ref={nameRef} placeholder={t('Your name')} maxLength={60} defaultValue={profile.name} />
    <div className="dim small" style={{ margin: '10px 2px 0' }}>{t('Preferences')}</div>
    <TextArea ref={prefsRef} maxLength={500} rows={3}
      placeholder={t('Anything worth remembering — schedule, likes and dislikes. Free text for now; future features may read it.')}
      defaultValue={profile.preferences} />
    <div style={{ height: 12 }} />
    <Button variant="primary" onClick={() => {
      update(s => { s.profile = normalizeProfile({ ...s.profile, name: nameRef.current.value, preferences: prefsRef.current.value }) })
      close()
    }}>{t('Save')}</Button>
    <div style={{ height: 8 }} />
  </>
}

function openIdentitySheet() {
  useUI.getState().openSheet(close => <IdentitySheet close={close} />)
}

// Multi-select over the dataset's own equipment vocabulary (see EQUIPMENT) —
// toggles apply immediately, the sheet stays open for browsing.
function openEquipmentSheet(profile) {
  const selected = new Set(profile.equipment)
  useUI.getState().openSheet(close => <>
    <h3>{t('Available equipment')}</h3>
    <div className="muted small" style={{ marginBottom: 10 }}>{t('Used to match exercises to what you can train with.')}</div>
    <div className="sect-b">
      {EQUIPMENT.map(eq => (
        <button key={eq} className="lrow tap" onClick={() => {
          selected.has(eq) ? selected.delete(eq) : selected.add(eq)
          useStore.getState().update(s => { s.profile = normalizeProfile({ ...s.profile, equipment: [...selected] }) })
        }}>
          <span className="lrow-m"><span className="lrow-t">{eq}</span></span>
          {selected.has(eq) && <Icon name="check" className="lrow-k" />}
        </button>
      ))}
    </div>
    <div style={{ height: 8 }} />
    <Button variant="primary" onClick={close}>{t('Done')}</Button>
    <div style={{ height: 8 }} />
  </>)
}

// One row per measurement site with its latest reading; typing a value into a row
// logs a NEW record for today (append-only — older readings are never rewritten).
// The input commits on blur so partial typing ("8", then "82") never lands as junk.
function MeasurementsSheet() {
  const measurements = normalizeMeasurements(useStore.getState().S.measurements)
  return <>
    <h3>{t('Measurements')}</h3>
    <div className="muted small" style={{ marginBottom: 10 }}>
      {t('Centimetres. A new reading is added to the log — nothing already recorded is overwritten.')}
    </div>
    <div className="sect-b">
      {MEASUREMENT_KEYS.map(k => {
        const latest = latestMeasurement(measurements, k)
        return (
          <Row key={k} title={t(MEASUREMENT_LABEL[k])}
            subtitle={latest ? t('{0}', todayISO()) : null}
            value={latest ? fmtNum(latest.v) + ' cm' : null}>
            <NumberField nullable decimal value={null}
              placeholder={latest ? String(latest.v) : '—'}
              onBlur={e => {
                const v = parseFloat((e.target.value || '').replace(',', '.'))
                if (!Number.isFinite(v) || v <= 0 || v > MEASUREMENT_MAX_CM) return
                useStore.getState().update(s => {
                  s.measurements = normalizeMeasurements([...(s.measurements || []), { d: todayISO(), k, v }])
                })
              }} />
            <span className="dim small">cm</span>
          </Row>
        )
      })}
    </div>
    <div style={{ height: 8 }} />
  </>
}

function openMeasurementsSheet() {
  useUI.getState().openSheet(close => <MeasurementsSheet close={close} />)
}

// AI coach provider (phase 9). Opt-in and local-first: the config lives in its OWN
// localStorage key — deliberately outside S, so it never syncs and never lands in a
// backup or export. Without a configured endpoint the coach UI simply doesn't exist.
function CoachCard() {
  const [cfg, setCfg] = useState(() => loadCoachCfg())
  const toast = useUI(s => s.toast)
  const set = patch => setCfg(c => { const n = { ...c, ...patch }; saveCoachCfg(n); return n })
  return <Section title={t('AI coach')}
    footer={t('Answers come from the endpoint you configure below, built only from your logged data. Nothing is sent anywhere until you ask a question.')}>
    <Row icon="sparkles" iconTint={coachConfigured(cfg) ? 'var(--acc)' : 'var(--grey)'}
      title={t('Ask the coach about your training')}
      subtitle={coachConfigured(cfg)
        ? t('Ready — questions live in Stats → Progress overview.')
        : t('Off. Configure an OpenAI-compatible endpoint to enable it.')}>
      <Switch checked={coachConfigured(cfg)} onChange={v => {
        if (!v) { set({ model: '' }); toast(t('Coach disabled')) }
        else if (!cfg.model) toast(t('Pick a model below first'))
      }} />
    </Row>
    <div style={{ padding: '2px 0 10px' }}>
      <input className="input" placeholder="http://localhost:11434/v1" value={cfg.baseUrl}
        onChange={e => set({ baseUrl: e.target.value })} autoCapitalize="off" autoCorrect="off" />
      <div className="dim small" style={{ marginTop: 6 }}>{t('OpenAI-compatible endpoint — Ollama, LM Studio, OpenAI, Groq…')}</div>
      <div style={{ height: 8 }} />
      <input className="input" placeholder={t('Model')} value={cfg.model} onChange={e => set({ model: e.target.value })}
        autoCapitalize="off" autoCorrect="off" />
      <div style={{ height: 8 }} />
      <input className="input" type="password" placeholder={t('API key (if needed)')} value={cfg.key}
        onChange={e => set({ key: e.target.value })} autoCapitalize="off" autoCorrect="off" />
      <div className="dim small" style={{ marginTop: 6 }}>{t('Stored only on this device — never synced, never in backups.')}</div>
    </div>
  </Section>
}

function NotificationsCard({ S, update, toast }) {
  if (MOBILE) return <MobileReminderCard S={S} update={update} toast={toast} />
  return <PushCard S={S} update={update} toast={toast} />
}

// Mobile build: the reminder is a native local notification scheduled on planned weekdays —
// no push server involved. The schedule itself is (re)synced by the store on every persist;
// this card only owns the OS permission prompt when the switch turns on.
function MobileReminderCard({ S, update, toast }) {
  const setReminder = patch => update(s => { s.reminder = { ...(s.reminder || DEF.reminder), ...patch, tz: localTZ() } })
  const toggle = async () => {
    const on = !S.reminder?.on
    if (on) {
      const ok = await syncReminder({ ...S, reminder: { ...(S.reminder || DEF.reminder), on: true } }, true)
      if (!ok) { toast(t('Could not change notification settings')); return }
    }
    setReminder({ on })
  }
  return (
    <Section title={t('Notifications')}
      footer={S.reminder?.on ? t('Reminds you at this time on days that have a routine planned.') : null}>
      <Row icon="calendar" iconTint="var(--orange)" title={t('Workout day reminder')}>
        <Switch checked={!!S.reminder?.on} onChange={toggle} />
      </Row>
      {S.reminder?.on && (
        <Row icon="clock" iconTint="var(--purple)" title={t('Reminder time')}>
          <input type="time" className="timef" value={S.reminder?.time || DEF.reminder.time}
            onChange={e => setReminder({ time: e.target.value })} />
        </Row>
      )}
    </Section>
  )
}

function PushCard({ S, update, toast }) {
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const supported = pushSupported()

  useEffect(() => {
    if (!supported) return
    navigator.serviceWorker.ready.then(reg => reg.pushManager.getSubscription()).then(sub => setOn(!!sub)).catch(() => {})
  }, [supported])

  const toggle = async v => {
    setBusy(true)
    try {
      if (!v) { await disablePush(); setOn(false); toast(t('Notifications off')) }
      else { await enablePush(); setOn(true); toast(t('Notifications on')) }
    } catch (e) { toast(e.message || t('Could not change notification settings')) }
    setBusy(false)
  }
  const test = async () => {
    try { await sendTestPush(); toast(t('Test sent — should arrive any second')) }
    catch (e) { toast(e.message || t('Test failed')) }
  }

  if (!supported) return (
    <Section title={t('Notifications')}>
      <Row icon="bellSlash" iconTint="var(--grey)" title={t('Not supported in this browser.')} />
    </Section>
  )

  return <>
    <Section
      title={t('Notifications')}
      footer={on && S.reminder?.on
        ? t("Only sent on days you have a routine planned and haven't logged a workout yet.") +
          (S.reminder?.tz ? ' ' + t('Timezone: {0} (auto-detected, updates if you travel).', S.reminder.tz) : '')
        : null}
    >
      <Row icon="bell" iconTint="var(--red)" title={t('Push notifications')} subtitle={t('Rest-timer alerts, even if MiGym is closed.')}>
        <Switch checked={on} disabled={busy} onChange={toggle} />
      </Row>
      {on && (
        <Row icon="calendar" iconTint="var(--orange)" title={t('Workout day reminder')}>
          <Switch checked={!!S.reminder?.on} onChange={() => update(s => { s.reminder = { ...(s.reminder || DEF.reminder), on: !s.reminder?.on, tz: localTZ() } })} />
        </Row>
      )}
      {on && S.reminder?.on && (
        <Row icon="clock" iconTint="var(--purple)" title={t('Reminder time')}>
          <input type="time" className="timef" value={S.reminder?.time || DEF.reminder.time}
            onChange={e => update(s => { s.reminder = { ...(s.reminder || DEF.reminder), time: e.target.value, tz: localTZ() } })} />
        </Row>
      )}
    </Section>
    {on && <div style={{ marginTop: -12, marginBottom: 22 }}><Button size="sm" icon="bell" onClick={test}>{t('Send test notification')}</Button></div>}
  </>
}

// The same registration as the sign-in screen's, reached from Settings instead. It asks for
// the invite code on the same terms: an invite-only instance rejects a registration without
// one, so a form that cannot collect it is a form that cannot succeed.
function RegisterInline({ close, setUser, pushState, pullState, toast }) {
  const nameRef = useRef(null)
  const [code, setCode] = useState('')
  const [inviteOnly, setInviteOnly] = useState(false)
  useEffect(() => { api('/api/config').then(c => setInviteOnly(!!c.invite_only)).catch(() => {}) }, [])
  const go = async () => {
    const n = (nameRef.current.value || '').trim()
    if (!n) { toast(t('Enter a name')); return }
    if (inviteOnly && !code.trim()) { toast(t('An invite code is required')); return }
    try {
      const u = await passkeyRegister(n, code.trim()); setUser(u); close()
      if (hasData(useStore.getState().S)) { await pushState(); toast(t('Profile created — data moved into it')) }
      else { await pullState(); toast(t('Welcome, {0}', u.name)) }
    } catch (e) { if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') toast(e.message || t('Registration failed')) }
  }
  return <>
    <h3>{t('Create your profile')}</h3>
    <div className="muted small" style={{ marginBottom: 14 }}>{t('Pick a name, then confirm with your device.')}</div>
    <TextField ref={nameRef} placeholder={t('Your name')} maxLength={40} />
    {inviteOnly && <>
      <div style={{ height: 10 }} />
      <input className="input" placeholder={t('Invite code')} maxLength={40} value={code}
        onChange={e => setCode(e.target.value.toUpperCase())} style={{ letterSpacing: '.14em', fontWeight: 600, textAlign: 'center' }} />
      <div className="dim small" style={{ marginTop: 6 }}>{t('This app is invite-only — enter the code you were given.')}</div>
    </>}
    <div style={{ height: 12 }} /><Button variant="primary" onClick={go}>{t('Create passkey')}</Button>
  </>
}
