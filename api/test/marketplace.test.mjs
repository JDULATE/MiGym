// Coach-marketplace integration tests (ADR-0008).
// Same harness as coach.test.mjs: real server, temp DATA_DIR, hand-minted cookies.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

let dataDir, child, port

const ADMIN = { id: 'adminuid123456', name: 'Admin Sam' }
const APPLICANT = { id: 'applcuid123456', name: 'Coach Ada' }
const VISITOR = { id: 'visitorid12345', name: 'Visitor Kim' }

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
  const ct = res.headers.get('content-type') || ''
  return { status: res.status, body: ct.includes('json') ? await res.json().catch(() => ({})) : await res.text() }
}

const fakeJpeg = n => 'data:image/jpeg;base64,' + crypto.randomBytes(n || 400).toString('base64')

before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'migym-mkt-'))
  port = 21000 + Math.floor(Math.random() * 20000)
  const db = {
    users: [
      { id: ADMIN.id, name: ADMIN.name, created: new Date().toISOString(), admin: true },
      { id: APPLICANT.id, name: APPLICANT.name, created: new Date().toISOString() },
      { id: VISITOR.id, name: VISITOR.name, created: new Date().toISOString() },
    ],
    creds: [], subs: [], invites: [], pairings: [], links: [], coachProfiles: [],
  }
  fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify(db))
  child = spawn(process.execPath, [path.join(process.cwd(), 'server.js')], {
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, RP_ID: 'localhost',
           ORIGIN: 'http://localhost', ADMIN_UIDS: ADMIN.id },
    stdio: ['ignore', 'ignore', 'inherit'],
  })
  const deadline = Date.now() + 10000
  while (true) {
    try { if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) break } catch {}
    if (child.exitCode != null) throw new Error('server exited ' + child.exitCode)
    if (Date.now() > deadline) throw new Error('server did not start')
    await new Promise(r => setTimeout(r, 150))
  }
})

after(async () => {
  if (child) { child.kill(); await new Promise(r => { child.on('exit', r); setTimeout(r, 2000) }) }
  fs.rmSync(dataDir, { recursive: true, force: true })
})

test('directory starts empty and is publicly readable', async () => {
  const r = await call(null, 'GET', '/api/marketplace/coaches')
  assert.equal(r.status, 200)
  assert.deepEqual(r.body.coaches, [])
})

test('anonymous submissions are rejected', async () => {
  const r = await call(null, 'PUT', '/api/marketplace/profile', { bio: 'hi' })
  assert.equal(r.status, 401)
})

test('a user applies, stays invisible until approved', async () => {
  const put = await call(APPLICANT.id, 'PUT', '/api/marketplace/profile', {
    bio: 'Strength coach, 10 years.', certs: 'NSCA-CSCS', tags: ['powerlifting', 'beginners'],
    modality: 'online', langs: ['es', 'en'], rate: '$30/session',
    contact: { wa: '+50688887777', ig: 'coach.ada', email: 'ada@example.com', web: '' },
  })
  assert.equal(put.status, 200)
  assert.equal(put.body.status, 'pending')
  // pending profiles never leak into the public directory…
  let pub = await call(null, 'GET', '/api/marketplace/coaches')
  assert.equal(pub.body.coaches.length, 0)
  // …and the contact sanitizer strips what it should
  const mine = await call(APPLICANT.id, 'GET', '/api/marketplace/myprofile')
  assert.equal(mine.body.profile.contact.wa, '+50688887777')
})

test('avatar upload validates type and size, then serves publicly', async () => {
  const badType = await call(APPLICANT.id, 'PUT', '/api/marketplace/avatar', { data: 'data:image/gif;base64,' + 'A'.repeat(300) })
  assert.equal(badType.status, 400)
  const tooBig = await call(APPLICANT.id, 'PUT', '/api/marketplace/avatar', { data: fakeJpeg(260 * 1024) })
  assert.equal(tooBig.status, 400)
  const ok = await call(APPLICANT.id, 'PUT', '/api/marketplace/avatar', { data: fakeJpeg(1000) })
  assert.equal(ok.status, 200)
  assert.equal(ok.body.avatarV, 1)
  const res = await fetch(`http://127.0.0.1:${port}/api/marketplace/avatar?uid=${APPLICANT.id}`)
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type'), /image\/jpeg/)
  const traversal = await call(null, 'GET', '/api/marketplace/avatar?uid=..%2F..%2Fsecret')
  assert.equal(traversal.status, 400)
})

test('admin approves; listing goes public and the coach capability is granted', async () => {
  const forbidden = await call(VISITOR.id, 'POST', '/api/admin/coach-decision', { uid: APPLICANT.id, decision: 'approved' })
  assert.equal(forbidden.status, 403)
  const apps = await call(ADMIN.id, 'GET', '/api/admin/coach-apps')
  assert.equal(apps.status, 200)
  assert.equal(apps.body.apps.length, 1)
  assert.equal(apps.body.apps[0].status, 'pending')
  const dec = await call(ADMIN.id, 'POST', '/api/admin/coach-decision', { uid: APPLICANT.id, decision: 'approved' })
  assert.equal(dec.status, 200)
  const pub = await call(null, 'GET', '/api/marketplace/coaches')
  assert.equal(pub.body.coaches.length, 1)
  assert.equal(pub.body.coaches[0].name, APPLICANT.name)
  assert.equal(pub.body.coaches[0].contact.ig, 'coach.ada')
  // approval unlocks the ADR-0007 coach endpoints
  const clients = await call(APPLICANT.id, 'GET', '/api/coach/clients')
  assert.equal(clients.status, 200)
})

test('editing an approved profile sends it back to review', async () => {
  const edit = await call(APPLICANT.id, 'PUT', '/api/marketplace/profile', { bio: 'Updated bio.' })
  assert.equal(edit.body.status, 'pending')
  const pub = await call(null, 'GET', '/api/marketplace/coaches')
  assert.equal(pub.body.coaches.length, 0)
  await call(ADMIN.id, 'POST', '/api/admin/coach-decision', { uid: APPLICANT.id, decision: 'approved' })
})

test('hiding removes a listing from the public directory', async () => {
  await call(ADMIN.id, 'POST', '/api/admin/coach-decision', { uid: APPLICANT.id, decision: 'hidden' })
  const pub = await call(null, 'GET', '/api/marketplace/coaches')
  assert.equal(pub.body.coaches.length, 0)
})
