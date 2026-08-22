// Coach-platform integration tests (ADR-0007).
//
// Spawns the real server against a temp DATA_DIR seeded with a coach and a client, mints
// session cookies the same way server.js signs them, and exercises the consent flow end
// to end: pairing code → link → scoped reads → notes → revocation.
// Run: npm test  (node --test)
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

let dataDir, child, port

const COACH = { id: 'coachuid123456', name: 'Coach Ada' }
const CLIENT = { id: 'clientuid12345', name: 'Client Ben' }

function cookieFor(uid) {
  const secret = fs.readFileSync(path.join(dataDir, 'secret'), 'utf8').trim()
  const payload = `${uid}:${Date.now() + 86400000}:0`
  const mac = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  return `gymsid=${payload}.${mac}`
}

async function call(uid, method, p, body) {
  const res = await fetch(`http://127.0.0.1:${port}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: uid ? cookieFor(uid) : '' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, body: await res.json().catch(() => ({})) }
}

before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'migym-api-'))
  port = 20000 + Math.floor(Math.random() * 20000)
  // seed: two users, one flagged coach; no credentials — cookies are minted in-process
  const db = {
    users: [
      { id: COACH.id, name: COACH.name, created: new Date().toISOString(), role: 'coach' },
      { id: CLIENT.id, name: CLIENT.name, created: new Date().toISOString() },
    ],
    creds: [], subs: [], invites: [], pairings: [], links: [],
  }
  fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify(db))
  const serverFile = path.join(process.cwd(), 'server.js')
  child = spawn(process.execPath, [serverFile], {
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, RP_ID: 'localhost', ORIGIN: 'http://localhost' },
    stdio: ['ignore', 'ignore', 'inherit'],
  })
  // wait for /api/health instead of parsing stdout — pipes buffer unpredictably
  const deadline = Date.now() + 10000
  while (true) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/health`)
      if (r.ok) break
    } catch { /* not up yet */ }
    if (child.exitCode != null) throw new Error('server exited ' + child.exitCode)
    if (Date.now() > deadline) throw new Error('server did not start')
    await new Promise(r => setTimeout(r, 150))
  }
})

after(async () => {
  if (child) { child.kill(); await new Promise(r => { child.on('exit', r); setTimeout(r, 2000) }) }
  fs.rmSync(dataDir, { recursive: true, force: true })
})

test('a plain user cannot use coach endpoints', async () => {
  const r = await call(CLIENT.id, 'GET', '/api/coach/clients')
  assert.equal(r.status, 403)
})

test('unauthenticated requests are rejected', async () => {
  const r = await call(null, 'GET', '/api/coach/clients')
  assert.equal(r.status, 401)
})

test('client mints a pairing code; coach redeems it into a summary-scoped link', async () => {
  const made = await call(CLIENT.id, 'POST', '/api/coach/code', { scope: 'summary' })
  assert.equal(made.status, 200)
  assert.match(made.body.code, /^[0-9A-F]{8}$/)

  const linked = await call(COACH.id, 'POST', '/api/coach/link', { code: made.body.code })
  assert.equal(linked.status, 200)
  assert.equal(linked.body.client, CLIENT.name)
  assert.equal(linked.body.scope, 'summary')

  const again = await call(COACH.id, 'POST', '/api/coach/link', { code: made.body.code })
  assert.equal(again.status, 400)                       // single-use
})

test('summary scope serves derived numbers but never individual sets', async () => {
  const r = await call(COACH.id, 'GET', '/api/coach/client?id=' + CLIENT.id)
  assert.equal(r.status, 200)
  assert.equal(r.body.client.name, CLIENT.name)
  assert.equal(typeof r.body.client.totalWorkouts, 'number')
  assert.equal(r.body.scope, 'summary')
  assert.equal(r.body.workouts, undefined)
})

test('the client controls the scope: full consent exposes workouts, then back down', async () => {
  let code = (await call(CLIENT.id, 'POST', '/api/coach/code', { scope: 'full' })).body.code
  await call(COACH.id, 'POST', '/api/coach/link', { code })
  let r = await call(COACH.id, 'GET', '/api/coach/client?id=' + CLIENT.id)
  assert.equal(r.body.scope, 'full')
  assert.ok(Array.isArray(r.body.workouts))

  code = (await call(CLIENT.id, 'POST', '/api/coach/code', { scope: 'summary' })).body.code
  await call(COACH.id, 'POST', '/api/coach/link', { code })
  r = await call(COACH.id, 'GET', '/api/coach/client?id=' + CLIENT.id)
  assert.equal(r.body.scope, 'summary')
  assert.equal(r.body.workouts, undefined)
})

test('notes are written by the coach and are visible to the client', async () => {
  const w = await call(COACH.id, 'POST', '/api/coach/note', { clientId: CLIENT.id, text: 'Great week — keep the rest honest.' })
  assert.equal(w.status, 200)
  const mine = await call(CLIENT.id, 'GET', '/api/coach/mylinks')
  assert.equal(mine.status, 200)
  assert.equal(mine.body.links.length, 1)
  assert.equal(mine.body.links[0].coachName, COACH.name)
  assert.equal(mine.body.links[0].notes[0].text, 'Great week — keep the rest honest.')
})

test('revocation is unilateral and immediate', async () => {
  const rv = await call(CLIENT.id, 'POST', '/api/coach/revoke', { coachId: COACH.id })
  assert.equal(rv.status, 200)
  const list = await call(COACH.id, 'GET', '/api/coach/clients')
  assert.equal(list.body.clients.length, 0)
  const gone = await call(COACH.id, 'GET', '/api/coach/client?id=' + CLIENT.id)
  assert.equal(gone.status, 404)
})
