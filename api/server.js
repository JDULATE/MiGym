/* migym-api — passkey (WebAuthn) auth + per-user state storage for MiGym
   (forked from openGym, AGPL-3.0-or-later — © Duarte Santos).
   No framework, JSON-file storage, signed session cookies.               */
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse
} from '@simplewebauthn/server';
import webpush from 'web-push';

/* ---------- rate limiting (ADR: security audit M-1) ----------
   In-memory sliding window per IP. No dependencies. Two tiers:
   - auth endpoints (register/login): 10 req/min — brute-force surface
   - all other API endpoints: 60 req/min — generous for a single user */
const rateBuckets = new Map();   // ip -> { count, resetAt }
const RATE_AUTH = 10, RATE_API = 60, RATE_WINDOW = 60000;

function rateLimit(req, isAuth) {
  const ip = req.socket?.remoteAddress || 'unknown';
  const key = ip + (isAuth ? ':auth' : '');
  const now = Date.now();
  let b = rateBuckets.get(key);
  if (!b || now > b.resetAt) { b = { count: 0, resetAt: now + RATE_WINDOW }; rateBuckets.set(key, b); }
  b.count++;
  // prune stale buckets every ~1000 requests
  if (rateBuckets.size > 500) {
    for (const [k, v] of rateBuckets) if (now > v.resetAt) rateBuckets.delete(k);
  }
  return b.count <= (isAuth ? RATE_AUTH : RATE_API);
}

const AUTH_PATHS = ['/api/register', '/api/login'];
const RATE_EXEMPT = ['/api/health', '/api/config'];   // monitoring/public: never rate-limited

const PORT = +(process.env.PORT || 3000);
const DATA = process.env.DATA_DIR || '/data';
const RP_ID = process.env.RP_ID || 'localhost';
const ORIGIN = process.env.ORIGIN || 'http://localhost:8080';
const RP_NAME = process.env.RP_NAME || 'MiGym';
// Admin dashboard (issue): admins are matched by uid; INVITE_ONLY gates new signups behind a
// code the admin generates. Both default off so a fresh self-hosted instance stays open.
const ADMIN_UIDS = (process.env.ADMIN_UIDS || '').split(',').map(s => s.trim()).filter(Boolean);
const INVITE_ONLY = /^(1|true|yes|on)$/i.test(process.env.INVITE_ONLY || '');
// Guest mode ("Continue without account") keeps everything in the browser and never touches this
// server — but on an instance meant for a known set of people, an entrance nobody can walk back
// out of is still the wrong front door (#42). Default ON, so existing instances are unchanged;
// the polarity is inverted from INVITE_ONLY because the safe default here is the permissive one.
const ALLOW_GUEST = !/^(0|false|no|off)$/i.test(process.env.ALLOW_GUEST || '');
// 90 days keeps someone who trains a few times a week permanently signed in without a stolen
// cookie staying good for a year. Overridable because a family instance and one on the open
// internet don't want the same number. Only affects cookies minted from now on — the expiry is
// baked into each cookie when it's issued, so lowering this never cuts an existing session short.
const SESSION_DAYS = Math.max(1, +(process.env.SESSION_DAYS || 90) || 90);
const MAX_BODY = 5 * 1024 * 1024;
// Secure cookies require HTTPS; over plain http://localhost the flag would drop the cookie
const SECURE = /^https:/i.test(ORIGIN) ? ' Secure;' : '';

fs.mkdirSync(DATA, { recursive: true });

/* ---------- secret + db ---------- */
const secretFile = path.join(DATA, 'secret');
if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
const SECRET = fs.readFileSync(secretFile, 'utf8').trim();

const dbFile = path.join(DATA, 'db.json');
let db = { users: [], creds: [], subs: [], invites: [], pairings: [], links: [] };
try { db = JSON.parse(fs.readFileSync(dbFile, 'utf8')); } catch {}
db.subs = db.subs || [];
db.invites = db.invites || [];
  db.pairings = db.pairings || [];   // coach-platform pairing codes (ADR-0007)
  db.links = db.links || [];         // coach ↔ client links with consent scope
  db.coachProfiles = db.coachProfiles || [];   // marketplace listings (ADR-0008)
const AVATARS_DIR = path.join(DATA, 'avatars');   // marketplace profile photos (ADR-0008)
// Coach role is operator-granted: list user ids in COACH_UIDS (like ADMIN_UIDS). The role
// is stamped onto the stored user so /api/me reports it and routes can check it.
const COACH_UIDS = (process.env.COACH_UIDS || '').split(',').map(s => s.trim()).filter(Boolean);
for (const u of db.users) {
  if (COACH_UIDS.includes(u.id) && u.role !== 'coach') u.role = 'coach';
}
const isAdmin = user => !!user && (user.admin === true || ADMIN_UIDS.includes(user.id));
const isCoach = user => !!user && (user.role === 'coach' || isAdmin(user));
function saveDb() { atomicWrite(dbFile, JSON.stringify(db, null, 2)); }
function atomicWrite(file, content) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}
const stateFile = uid => path.join(DATA, 'state-' + uid.replace(/[^a-zA-Z0-9_-]/g, '') + '.json');
function readState(uid) {
  try { return JSON.parse(fs.readFileSync(stateFile(uid), 'utf8')); } catch { return null; }
}

/* ---------- snapshots (ADR-0006 stage 1) ----------
   Before a PUT overwrites a user's blob, the previous one is archived here. Any
   last-write-wins accident is then reversible with one click. Bounded per user. */
const SNAPSHOT_KEEP = 10;
const snapDir = uid => path.join(DATA, 'snapshots', uid.replace(/[^a-zA-Z0-9_-]/g, ''));
function takeSnapshot(uid) {
  const src = stateFile(uid);
  if (!fs.existsSync(src)) return;
  const dir = snapDir(uid);
  fs.mkdirSync(dir, { recursive: true });
  const name = Date.now() + '.json';
  fs.copyFileSync(src, path.join(dir, name));
  const snaps = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  while (snaps.length > SNAPSHOT_KEEP) fs.unlinkSync(path.join(dir, snaps.shift()));
}
function readSnapshot(uid, id) {
  // ids are plain numbers generated above; anything else is refused before it reaches the FS
  if (!/^\d+\.json$/.test(id)) return null;
  try { return JSON.parse(fs.readFileSync(path.join(snapDir(uid), id), 'utf8')); } catch { return null; }
}

/* ---------- push notifications (Web Push / VAPID) ---------- */
const vapidFile = path.join(DATA, 'vapid.json');
let vapid;
try { vapid = JSON.parse(fs.readFileSync(vapidFile, 'utf8')); }
catch { vapid = webpush.generateVAPIDKeys(); fs.writeFileSync(vapidFile, JSON.stringify(vapid), { mode: 0o600 }); }
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || (SECURE ? ORIGIN : 'mailto:admin@localhost');
webpush.setVapidDetails(VAPID_SUBJECT, vapid.publicKey, vapid.privateKey);

async function sendPush(userId, payload) {
  const subs = db.subs.filter(s => s.userId === userId);
  if (!subs.length) return;
  const body = JSON.stringify(payload);
  let dirty = false;
  await Promise.all(subs.map(async sub => {
    // urgency 'high' is the one lever we have over delivery speed — iOS/Android throttle
    // low-urgency background push more aggressively under battery-saving modes. TTL is left
    // at the library default (long) so a briefly-offline device still gets it once reconnected,
    // rather than risking it being dropped for the sake of shaving off latency that TTL doesn't
    // actually control anyway.
    try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, body, { urgency: 'high' }); }
    catch (e) {
      console.error('push send failed', userId, e.statusCode, e.body || e.message);
      if (e.statusCode === 404 || e.statusCode === 410) {
        db.subs = db.subs.filter(s => s.endpoint !== sub.endpoint); dirty = true;
      }
    }
  }));
  if (dirty) saveDb();
}

// Rest-timer alerts: client schedules on start/extend, cancels on skip or on-screen completion —
// this only fires when the tab was backgrounded/suspended and never got to cancel it itself.
const restTimers = new Map(); // userId -> Timeout
function scheduleRestTimer(userId, sec) {
  const t = restTimers.get(userId);
  if (t) clearTimeout(t);
  restTimers.set(userId, setTimeout(() => {
    restTimers.delete(userId);
    sendPush(userId, { title: 'Rest over 💪', body: 'Time for your next set.', tag: 'rest-timer' });
  }, sec * 1000));
}
function cancelRestTimer(userId) {
  const t = restTimers.get(userId);
  if (t) { clearTimeout(t); restTimers.delete(userId); }
}

// "Workout planned today" reminder — one per user per day, at their chosen time.
// Duplicated (not imported) from frontend/src/lib/history.js effectiveRoutineId — tiny pure helper, not worth sharing across the two runtimes.
function effectiveRoutineId(S, iso) {
  const ov = S.dayPlan?.[iso];
  if (ov === 'rest') return null;
  if (ov && S.routines?.some(r => r.id === ov)) return ov;
  const wd = new Date(iso + 'T12:00:00').getDay();
  return S.week?.[wd] || null;
}
// Computes "now" in an arbitrary IANA zone (e.g. "Europe/Lisbon") instead of the server's own —
// each user's reminder fires by their own clock, wherever they and their phone actually are.
function userNow(tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).formatToParts(new Date());
    const g = t => parts.find(p => p.type === t)?.value;
    return { date: `${g('year')}-${g('month')}-${g('day')}`, hhmm: `${g('hour')}:${g('minute')}` };
  } catch { return null; } // unknown/invalid tz string — skip this user rather than guess
}
setInterval(() => {
  for (const user of db.users) {
    if (!db.subs.some(s => s.userId === user.id)) continue;
    const S = readState(user.id);
    if (!S?.reminder?.on) continue;
    const now = userNow(S.reminder.tz || 'UTC');
    if (!now || S.reminder.time !== now.hhmm) continue;
    if (user.lastReminder === now.date) continue;
    if ((S.workouts || []).some(w => w.d === now.date)) continue;
    const rid = effectiveRoutineId(S, now.date);
    if (!rid) continue; // rest day — nothing planned
    const routine = (S.routines || []).find(r => r.id === rid);
    console.log('reminder firing', user.id, rid);
    user.lastReminder = now.date;
    saveDb();
    sendPush(user.id, {
      title: routine ? `${routine.emoji || '🏋️'} ${routine.name} today` : 'Workout planned today',
      body: "It's on your plan — let's go 💪",
      tag: 'day-reminder'
    });
  }
// Checked every 10s (not 60s) — ticks aren't aligned to the top of the minute, so a 60s
// interval could sit on your target minute for up to 59s before noticing. 10s caps that at ~9s.
}, 10000).unref();

/* ---------- sessions (signed cookie) ---------- */
function sign(payload) {
  const mac = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return payload + '.' + mac;
}
function verifySig(token) {
  const i = token.lastIndexOf('.');
  if (i < 0) return null;
  const payload = token.slice(0, i), mac = token.slice(i + 1);
  const expect = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expect))) return null;
  } catch { return null; }
  return payload;
}
// Session payload is `<uid>:<expiry>:<version>`, where the version is the user's `sv` counter.
// Bumping `sv` (POST /api/logout/all) makes every cookie ever handed out for that account stop
// verifying, which is the only revocation there was before short of deleting ./data/secret and
// signing out the whole instance. Cookies minted before `sv` existed have no third field and are
// read as version 0, matching a user who has never bumped — they stay valid until they expire.
const sessionVersion = user => user.sv || 0;
function makeSession(user) {
  const exp = Date.now() + SESSION_DAYS * 86400000;
  return sign(user.id + ':' + exp + ':' + sessionVersion(user));
}
function readSession(req) {
  const cookies = Object.fromEntries((req.headers.cookie || '').split(';').map(c => {
    const i = c.indexOf('='); return i < 0 ? ['', ''] : [c.slice(0, i).trim(), c.slice(i + 1).trim()];
  }));
  const tok = cookies.gymsid;
  if (!tok) return null;
  const payload = verifySig(tok);
  if (!payload) return null;
  const [uid, exp, ver] = payload.split(':');
  if (!uid || +exp < Date.now()) return null;
  const user = db.users.find(u => u.id === uid) || null;
  if (!user) return null;
  if (user.disabled) return null;           // disabled accounts are locked out everywhere
  // Missing third field = pre-versioning cookie = version 0. Anything non-numeric is a malformed
  // payload (it still had to pass the HMAC, so this is belt-and-braces) and is refused outright.
  const claimed = ver === undefined ? 0 : Number(ver);
  if (!Number.isInteger(claimed) || claimed !== sessionVersion(user)) return null;
  return user;
}
// Guard for /api/admin/* — resolves the caller and 401/403s if they aren't an admin.
function requireAdmin(req, res) {
  const user = readSession(req);
  if (!user) { json(res, 401, { error: 'not signed in' }); return null; }
  if (!isAdmin(user)) { json(res, 403, { error: 'forbidden' }); return null; }
  return user;
}
function sessionCookie(user) {
  return `gymsid=${makeSession(user)}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly;${SECURE} SameSite=Lax`;
}
const clearCookie = `gymsid=; Path=/; Max-Age=0; HttpOnly;${SECURE} SameSite=Lax`;

/* ---------- challenge store (in-memory, 5 min TTL) ---------- */
const challenges = new Map(); // cid -> {challenge, name?, uid?, exp}
function putChallenge(data) {
  const cid = crypto.randomBytes(16).toString('base64url');
  challenges.set(cid, { ...data, exp: Date.now() + 5 * 60000 });
  return cid;
}
function takeChallenge(cid) {
  const c = challenges.get(cid);
  challenges.delete(cid);
  if (!c || c.exp < Date.now()) return null;
  return c;
}
setInterval(() => { for (const [k, v] of challenges) if (v.exp < Date.now()) challenges.delete(k); }, 60000).unref();

/* ---------- helpers ---------- */
function json(res, code, obj, extraHeaders) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(extraHeaders || {}) });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', d => {
      size += d.length;
      if (size > MAX_BODY) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(d);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch { reject(new Error('bad json')); }
    });
    req.on('error', reject);
  });
}
const b64uToBuf = s => Buffer.from(s, 'base64url');

/* ---------- live presence (in-memory) ---------- */
// Clients heartbeat /api/activity while a workout is on screen; the admin dashboard reads who's
// live. Purely ephemeral — never persisted. Expires shortly after the last ping.
const presence = new Map();               // uid -> { name, exIdx, exTotal, setsDone, setsTotal, startedAt, updatedAt }
const PRESENCE_TTL = 70000;               // ~3.5× the 20s client heartbeat
function livePresence(uid) {
  const p = presence.get(uid);
  if (!p) return null;
  if (Date.now() - p.updatedAt > PRESENCE_TTL) { presence.delete(uid); return null; }
  return p;
}
setInterval(() => { for (const [k, v] of presence) if (Date.now() - v.updatedAt > PRESENCE_TTL) presence.delete(k); }, 30000).unref();

/* ---------- routes ---------- */
const routes = {
  'GET /api/health': async (req, res) => json(res, 200, { ok: true, users: db.users.length }),

  // Public config the login screen needs before anyone is signed in.
  'GET /api/config': async (req, res) => json(res, 200, { invite_only: INVITE_ONLY, allow_guest: ALLOW_GUEST }),

  'GET /api/me': async (req, res) => {
    const user = readSession(req);
    if (!user) return json(res, 401, { error: 'not signed in' });
    json(res, 200, { user: { id: user.id, name: user.name, admin: isAdmin(user), role: isCoach(user) ? 'coach' : 'user' } });
  },

  'POST /api/register/options': async (req, res) => {
    const body = await readBody(req);
    const name = String(body.name || '').trim().slice(0, 40);
    if (!name) return json(res, 400, { error: 'name required' });
    const code = String(body.code || '').trim().toUpperCase();
    if (INVITE_ONLY && !db.invites.some(i => i.code === code && !i.usedBy && !i.revoked))
      return json(res, 403, { error: 'a valid invite code is required' });
    const uid = crypto.randomBytes(12).toString('base64url');
    const options = await generateRegistrationOptions({
      rpName: RP_NAME, rpID: RP_ID,
      userID: Buffer.from(uid), userName: name, userDisplayName: name,
      attestationType: 'none',
      authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
      excludeCredentials: []
    });
    const cid = putChallenge({ challenge: options.challenge, name, uid, code });
    json(res, 200, { cid, options });
  },

  'POST /api/register/verify': async (req, res) => {
    const body = await readBody(req);
    const c = takeChallenge(body.cid);
    if (!c || !c.uid) return json(res, 400, { error: 'challenge expired — try again' });
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body.credential,
        expectedChallenge: c.challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        requireUserVerification: false
      });
    } catch (e) { return json(res, 400, { error: 'verification failed: ' + e.message }); }
    if (!verification.verified) return json(res, 400, { error: 'not verified' });
    const { credential } = verification.registrationInfo;
    if (db.creds.find(x => x.id === credential.id)) return json(res, 409, { error: 'credential already registered' });
    // Re-check the invite at the last moment (it may have been used/revoked since options), then burn it.
    let invite = null;
    if (INVITE_ONLY) {
      invite = db.invites.find(i => i.code === c.code && !i.usedBy && !i.revoked);
      if (!invite) return json(res, 403, { error: 'invite code is no longer valid — ask for a new one' });
    }
    const user = { id: c.uid, name: c.name, created: new Date().toISOString() };
    if (invite) { user.invitedBy = invite.code; invite.usedBy = user.id; invite.usedAt = user.created; }
    db.users.push(user);
    db.creds.push({
      id: credential.id, userId: user.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter || 0,
      transports: body.credential?.response?.transports || []
    });
    saveDb();
    json(res, 200, { user: { id: user.id, name: user.name, admin: isAdmin(user) } }, { 'Set-Cookie': sessionCookie(user) });
  },

  'POST /api/login/options': async (req, res) => {
    const options = await generateAuthenticationOptions({
      rpID: RP_ID, userVerification: 'preferred', allowCredentials: []
    });
    const cid = putChallenge({ challenge: options.challenge });
    json(res, 200, { cid, options });
  },

  'POST /api/login/verify': async (req, res) => {
    const body = await readBody(req);
    const c = takeChallenge(body.cid);
    if (!c) return json(res, 400, { error: 'challenge expired — try again' });
    const cred = db.creds.find(x => x.id === body.credential?.id);
    if (!cred) return json(res, 404, { error: 'unknown passkey — create a profile first' });
    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: body.credential,
        expectedChallenge: c.challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        requireUserVerification: false,
        credential: {
          id: cred.id,
          publicKey: b64uToBuf(cred.publicKey),
          counter: cred.counter,
          transports: cred.transports
        }
      });
    } catch (e) { return json(res, 400, { error: 'verification failed: ' + e.message }); }
    if (!verification.verified) return json(res, 400, { error: 'not verified' });
    cred.counter = verification.authenticationInfo.newCounter;
    saveDb();
    const user = db.users.find(u => u.id === cred.userId);
    if (!user) return json(res, 500, { error: 'user missing' });
    if (user.disabled) return json(res, 403, { error: 'this account has been disabled' });
    json(res, 200, { user: { id: user.id, name: user.name, admin: isAdmin(user) } }, { 'Set-Cookie': sessionCookie(user) });
  },

  'POST /api/logout': async (req, res) => json(res, 200, { ok: true }, { 'Set-Cookie': clearCookie }),

  // "Sign out everywhere" — bumps this user's session version, which invalidates every cookie
  // ever issued for the account, on every device, including a copy someone else walked off with.
  // The caller's own cookie is cleared here too, so the browser doing it doesn't sit on a token
  // it no longer accepts. Passkeys are untouched: signing back in works immediately.
  'POST /api/logout/all': async (req, res) => {
    const user = readSession(req);
    if (!user) return json(res, 401, { error: 'not signed in' });
    user.sv = sessionVersion(user) + 1;
    saveDb();
    json(res, 200, { ok: true }, { 'Set-Cookie': clearCookie });
  },

  'GET /api/data': async (req, res) => {
    const user = readSession(req);
    if (!user) return json(res, 401, { error: 'not signed in' });
    try {
      const state = JSON.parse(fs.readFileSync(stateFile(user.id), 'utf8'));
      json(res, 200, { state });
    } catch { json(res, 200, { state: null }); }
  },

  // Snapshot list + fetch for the restore flow (ADR-0006 stage 1). Newest first.
  'GET /api/data/snapshots': async (req, res) => {
    const user = readSession(req);
    if (!user) return json(res, 401, { error: 'not signed in' });
    let snaps = [];
    try {
      snaps = fs.readdirSync(snapDir(user.id)).filter(f => f.endsWith('.json'))
        .map(f => ({ id: f.replace(/\.json$/, ''), ts: Number(f.replace(/\.json$/, '')) }))
        .sort((a, b) => b.ts - a.ts);
    } catch { /* no snapshots yet */ }
    json(res, 200, { snapshots: snaps });
  },

  'GET /api/data/snapshot': async (req, res) => {
    const user = readSession(req);
    if (!user) return json(res, 401, { error: 'not signed in' });
    const id = new URL(req.url, 'http://x').searchParams.get('id') || '';
    const snap = readSnapshot(user.id, id);
    if (!snap) return json(res, 404, { error: 'no such snapshot' });
    json(res, 200, { state: snap });
  },

  'PUT /api/data': async (req, res) => {
    const user = readSession(req);
    if (!user) return json(res, 401, { error: 'not signed in' });
    const body = await readBody(req);
    if (!body.state || typeof body.state !== 'object') return json(res, 400, { error: 'state required' });
    delete body.state.active;              // in-progress workouts stay device-local
    takeSnapshot(user.id);                 // archive the previous copy before overwriting
    atomicWrite(stateFile(user.id), JSON.stringify(body.state));
    json(res, 200, { ok: true, ts: body.state._ts || null });
  },

  'GET /api/push/public-key': async (req, res) => json(res, 200, { key: vapid.publicKey }),

  'POST /api/push/subscribe': async (req, res) => {
    const user = readSession(req);
    if (!user) return json(res, 401, { error: 'not signed in' });
    const body = await readBody(req);
    const sub = body.subscription;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return json(res, 400, { error: 'invalid subscription' });
    db.subs = db.subs.filter(s => s.endpoint !== sub.endpoint);
    db.subs.push({ userId: user.id, endpoint: sub.endpoint, keys: sub.keys, created: new Date().toISOString() });
    saveDb();
    json(res, 200, { ok: true });
  },

  'POST /api/push/unsubscribe': async (req, res) => {
    const user = readSession(req);
    if (!user) return json(res, 401, { error: 'not signed in' });
    const body = await readBody(req);
    db.subs = db.subs.filter(s => !(s.userId === user.id && s.endpoint === body.endpoint));
    saveDb();
    json(res, 200, { ok: true });
  },

  'POST /api/push/test': async (req, res) => {
    const user = readSession(req);
    if (!user) return json(res, 401, { error: 'not signed in' });
    await sendPush(user.id, { title: 'MiGym', body: 'Test notification ✅ — this is what alerts look like.', tag: 'test' });
    json(res, 200, { ok: true });
  },

  'POST /api/push/rest-timer': async (req, res) => {
    const user = readSession(req);
    if (!user) return json(res, 401, { error: 'not signed in' });
    const body = await readBody(req);
    const sec = Math.max(1, Math.min(3600, Math.round(+body.seconds || 0)));
    if (!sec) return json(res, 400, { error: 'seconds required' });
    scheduleRestTimer(user.id, sec);
    json(res, 200, { ok: true });
  },

  'POST /api/push/rest-timer/cancel': async (req, res) => {
    const user = readSession(req);
    if (!user) return json(res, 401, { error: 'not signed in' });
    cancelRestTimer(user.id);
    json(res, 200, { ok: true });
  },

  // Live-workout heartbeat: client pings while a workout is on screen; { active:false } drops it.
  'POST /api/activity': async (req, res) => {
    const user = readSession(req);
    if (!user) return json(res, 401, { error: 'not signed in' });
    const body = await readBody(req);
    if (body.active) {
      presence.set(user.id, {
        name: String(body.name || '').slice(0, 60),
        exIdx: +body.exIdx || 0, exTotal: +body.exTotal || 0,
        setsDone: +body.setsDone || 0, setsTotal: +body.setsTotal || 0,
        startedAt: +body.startedAt || Date.now(),
        updatedAt: Date.now()
      });
    } else presence.delete(user.id);
    json(res, 200, { ok: true });
  },

  /* ---------- coach platform (ADR-0007) ----------
     Consent-based links: the client mints a pairing code and hands it to the coach;
     the coach redeems it. Scopes are enforced HERE, before serialization — a summary
     response is computed, never a redacted copy of the state blob. Either side can
     unlink at any time; the client always sees every link and every coach note. */
  'POST /api/coach/code': async (req, res) => {
    const user = readSession(req);
    if (!user) return json(res, 401, { error: 'not signed in' });
    const body = await readBody(req);
    const scope = body.scope === 'full' ? 'full' : 'summary';
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    db.pairings = db.pairings.filter(p => p.uid !== user.id);   // one live code per user
    db.pairings.push({ code, uid: user.id, scope, exp: Date.now() + 15 * 60000 });
    saveDb();
    json(res, 200, { code, scope, expiresInSec: 900 });
  },

  'POST /api/coach/link': async (req, res) => {
    const user = readSession(req);
    if (!user) return json(res, 401, { error: 'not signed in' });
    if (!isCoach(user)) return json(res, 403, { error: 'coach account required' });
    const body = await readBody(req);
    const code = String(body.code || '').trim().toUpperCase();
    const p = db.pairings.find(x => x.code === code);
    if (!p || p.exp < Date.now()) return json(res, 400, { error: 'invalid or expired code' });
    if (p.uid === user.id) return json(res, 400, { error: 'you cannot link to yourself' });
    db.pairings = db.pairings.filter(x => x !== p);
    let link = db.links.find(l => l.coachId === user.id && l.clientId === p.uid);
    if (!link) {
      link = { coachId: user.id, clientId: p.uid, scope: p.scope || 'summary', notes: [], created: new Date().toISOString() };
      db.links.push(link);
    } else link.scope = p.scope || link.scope;   // re-linking refreshes the consented scope
    saveDb();
    const client = db.users.find(u => u.id === p.uid);
    json(res, 200, { ok: true, client: client ? client.name : p.uid, scope: link.scope });
  },

  'GET /api/coach/clients': async (req, res) => {
    const user = readSession(req);
    if (!user) return json(res, 401, { error: 'not signed in' });
    if (!isCoach(user)) return json(res, 403, { error: 'coach account required' });
    const clients = db.links.filter(l => l.coachId === user.id).map(l => {
      const u = db.users.find(u => u.id === l.clientId);
      const S = readState(l.clientId) || {};
      const ws = S.workouts || [];
      const last30 = ws.filter(w => (w.start || 0) > Date.now() - 30 * 86400000).length;
      return {
        clientId: l.clientId,
        name: u ? u.name : l.clientId,
        scope: l.scope,
        totalWorkouts: ws.length,
        last30,
        lastSession: ws.length ? ws[ws.length - 1].d : null,
        lastSync: S._ts || null,
        notes: (l.notes || []).length,
      };
    });
    json(res, 200, { clients });
  },

  // Summary is computed from the client's state — derived numbers only. Individual sets
  // leave the server only when the link's consented scope says "full".
  'GET /api/coach/client': async (req, res) => {
    const user = readSession(req);
    if (!user) return json(res, 401, { error: 'not signed in' });
    if (!isCoach(user)) return json(res, 403, { error: 'coach account required' });
    const id = new URL(req.url, 'http://x').searchParams.get('id');
    const link = db.links.find(l => l.coachId === user.id && l.clientId === id);
    if (!link) return json(res, 404, { error: 'no such client' });
    const u = db.users.find(u => u.id === id);
    const S = readState(id) || {};
    const ws = S.workouts || [];
    const now = Date.now();
    const inWindow = days => ws.filter(w => (w.start || 0) > now - days * 86400000);
    const volumeOf = w => w.entries.reduce((v, e) => v + e.sets.reduce((n, s) => n + (s.done && !s.warmup ? (s.w || 0) * (s.r || 0) : 0), 0), 0);
    const summary = {
      name: u ? u.name : id,
      unit: S.unit || 'kg',
      totalWorkouts: ws.length,
      last30: inWindow(30).length,
      last90: inWindow(90).length,
      avgPerWeek28: Math.round(inWindow(28).length / 4 * 10) / 10,
      volume30: Math.round(inWindow(30).reduce((v, w) => v + volumeOf(w), 0)),
      lastSession: ws.length ? { d: ws[ws.length - 1].d, name: ws[ws.length - 1].name } : null,
    };
    json(res, 200, {
      client: summary,
      scope: link.scope,
      notes: link.notes || [],
      ...(link.scope === 'full' ? {
        routines: (S.routines || []).map(r => ({ name: r.name, exercises: (r.ex || []).length })),
        workouts: ws.slice(-20).reverse().map(w => ({
          d: w.d, name: w.name, durationMin: w.end && w.start ? Math.round((w.end - w.start) / 60000) : null,
          vol: Math.round(volumeOf(w)),
          entries: (w.entries || []).map(e => ({
            exercise: e.id,
            sets: (e.sets || []).filter(s => s.done).map(s => s.min != null
              ? `${s.min}min@${s.speed}`
              : s.sec != null ? `${s.sec}s${s.w > 0 ? '+' + s.w : ''}`
              : `${s.w || 0}×${s.r}${s.rir != null ? '@RIR' + s.rir : ''}`),
          })),
        })),
      } : {}),
    });
  },

  'POST /api/coach/note': async (req, res) => {
    const user = readSession(req);
    if (!user) return json(res, 401, { error: 'not signed in' });
    if (!isCoach(user)) return json(res, 403, { error: 'coach account required' });
    const body = await readBody(req);
    const text = String(body.text || '').trim().slice(0, 1000);
    const link = db.links.find(l => l.coachId === user.id && l.clientId === String(body.clientId || ''));
    if (!link) return json(res, 404, { error: 'no such client' });
    if (!text) return json(res, 400, { error: 'note required' });
    link.notes = link.notes || [];
    link.notes.push({ ts: Date.now(), by: user.name, text });
    saveDb();
    json(res, 200, { ok: true });
  },

  // Client side: what the server knows about sharing, plus revocation.
  'GET /api/coach/mylinks': async (req, res) => {
    const user = readSession(req);
    if (!user) return json(res, 401, { error: 'not signed in' });
    const links = db.links.filter(l => l.clientId === user.id).map(l => ({
      coachId: l.coachId,
      coachName: (db.users.find(u => u.id === l.coachId) || {}).name || l.coachId,
      scope: l.scope,
      created: l.created || null,
      notes: l.notes || [],
    }));
    const pending = db.pairings.filter(p => p.uid === user.id)
      .map(p => ({ code: p.code, scope: p.scope, expiresInSec: Math.max(0, Math.round((p.exp - Date.now()) / 1000)) }));
    json(res, 200, { links, pending });
  },

  'POST /api/coach/revoke': async (req, res) => {
    const user = readSession(req);
    if (!user) return json(res, 401, { error: 'not signed in' });
    const body = await readBody(req);
    const before = db.links.length;
    db.links = db.links.filter(l => !(l.clientId === user.id && l.coachId === String(body.coachId || '')));
    if (db.links.length === before) return json(res, 404, { error: 'no such link' });
    saveDb();
    json(res, 200, { ok: true });
  },

  /* ---------- coach marketplace (ADR-0008) ----------
     Public directory of coach profiles with external contact links. Browsing is
     anonymous; publishing requires a signed-in user; listing requires an admin
     approval. Avatars are client-resized JPEGs stored under DATA_DIR/avatars/. */

  // Public: approved profiles only, business-card fields only.
  'GET /api/marketplace/coaches': async (req, res) => {
    const coaches = db.coachProfiles.filter(p => p.status === 'approved').map(p => {
      const u = db.users.find(x => x.id === p.uid) || {};
      return {
        uid: p.uid,
        name: u.name || 'Coach',
        bio: p.bio || '',
        certs: p.certs || '',
        tags: p.tags || [],
        modality: p.modality || 'both',
        langs: p.langs || [],
        rate: p.rate || '',
        country: p.country || '',
        province: p.province || '',
        place: p.place || '',
        contact: p.contact || {},
        avatarV: p.avatarV || 0,
        since: p.decided || p.updated || null,
      };
    });
    json(res, 200, { coaches });
  },

  // Public: serve an avatar file. uid is validated so the resolved path can never leave avatars/.
  'GET /api/marketplace/avatar': async (req, res) => {
    const urlObj = new URL(req.url, 'http://x');
    const uid = String(urlObj.searchParams.get('uid') || '');
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(uid)) { json(res, 400, { error: 'bad uid' }); return; }
    const file = path.join(AVATARS_DIR, uid + '.jpg');
    if (!file.startsWith(AVATARS_DIR + path.sep) || !fs.existsSync(file)) { json(res, 404, { error: 'no avatar' }); return; }
    res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' });
    fs.createReadStream(file).pipe(res);
  },

  // Own profile: full record incl. moderation status.
  'GET /api/marketplace/myprofile': async (req, res) => {
    const user = readSession(req);
    if (!user) return json(res, 401, { error: 'not signed in' });
    const p = db.coachProfiles.find(x => x.uid === user.id) || null;
    json(res, 200, { profile: p ? { ...p, uid: undefined } : null });
  },

  // Create or update own application. Every save goes back to 'pending' review.
  'PUT /api/marketplace/profile': async (req, res) => {
    const user = readSession(req);
    if (!user) return json(res, 401, { error: 'not signed in' });
    const body = await readBody(req);
    const clip = (v, n) => String(v ?? '').trim().slice(0, n);
    const tags = Array.isArray(body.tags) ? body.tags.slice(0, 8).map(t => clip(t, 24)).filter(Boolean) : [];
    const langs = Array.isArray(body.langs) ? body.langs.slice(0, 6).map(l => clip(l, 8)).filter(Boolean) : [];
    const modality = ['online', 'inperson', 'both'].includes(body.modality) ? body.modality : 'both';
    const c = body.contact || {};
    const contact = {
      wa: clip(c.wa, 20).replace(/[^\d+]/g, ''),
      ig: clip(c.ig, 40).replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, ''),
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(c.email || '').trim()) ? clip(c.email, 80) : '',
      web: /^https?:\/\//i.test(String(c.web || '').trim()) ? clip(c.web, 120) : '',
    };
    let p = db.coachProfiles.find(x => x.uid === user.id);
    if (!p) { p = { uid: user.id, created: new Date().toISOString() }; db.coachProfiles.push(p); }
    Object.assign(p, {
      bio: clip(body.bio, 500),
      certs: clip(body.certs, 300),
      tags, langs, modality, contact,
      rate: clip(body.rate, 60),
      country: clip(body.country, 40),
      province: clip(body.province, 40),
      place: clip(body.place, 80),
      status: 'pending',
      updated: new Date().toISOString(),
    });
    saveDb();
    json(res, 200, { status: p.status });
  },

  // Avatar upload: base64 image data URL, decoded size hard-capped. Client already resized.
  'PUT /api/marketplace/avatar': async (req, res) => {
    const user = readSession(req);
    if (!user) return json(res, 401, { error: 'not signed in' });
    const body = await readBody(req);
    const data = String(body.data || '');
    const m = data.match(/^data:image\/(?:jpeg|png);base64,([A-Za-z0-9+/=]+)$/);
    if (!m) return json(res, 400, { error: 'expected a jpeg/png data URL' });
    const buf = Buffer.from(m[1], 'base64');
    if (buf.length < 100 || buf.length > 250 * 1024) return json(res, 400, { error: 'image must be between 100 B and 250 KB' });
    fs.mkdirSync(AVATARS_DIR, { recursive: true });
    fs.writeFileSync(path.join(AVATARS_DIR, user.id + '.jpg'), buf);
    const p = db.coachProfiles.find(x => x.uid === user.id);
    if (p) { p.avatarV = (p.avatarV || 0) + 1; saveDb(); }
    json(res, 200, { ok: true, avatarV: p ? p.avatarV : 1 });
  },

  'DELETE /api/marketplace/avatar': async (req, res) => {
    const user = readSession(req);
    if (!user) return json(res, 401, { error: 'not signed in' });
    const file = path.join(AVATARS_DIR, user.id + '.jpg');
    try { fs.unlinkSync(file); } catch {}
    const p = db.coachProfiles.find(x => x.uid === user.id);
    if (p) { p.avatarV = (p.avatarV || 0) + 1; saveDb(); }
    json(res, 200, { ok: true });
  },

  /* ---------- admin dashboard ---------- */
  // One row per user, cheap enough for a personal instance (reads each state file once).
  'GET /api/admin/users': async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const users = db.users.map(u => {
      const S = readState(u.id) || {};
      const workouts = S.workouts || [];
      const last = workouts[workouts.length - 1];
      return {
        id: u.id, name: u.name, created: u.created || null,
        disabled: !!u.disabled, admin: isAdmin(u), invitedBy: u.invitedBy || null,
        workouts: workouts.length,
        lastWorkout: last ? last.d : null,
        lastSync: S._ts || null,
        hasPush: db.subs.some(s => s.userId === u.id),
        live: livePresence(u.id)
      };
    });
    json(res, 200, { users, invite_only: INVITE_ONLY, now: Date.now() });
  },

  // Drill-down: full workout history + body-weight log for one user.
  'GET /api/admin/user': async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const id = new URL(req.url, 'http://x').searchParams.get('id');
    const u = db.users.find(x => x.id === id);
    if (!u) return json(res, 404, { error: 'no such user' });
    const S = readState(u.id) || {};
    json(res, 200, {
      user: { id: u.id, name: u.name, created: u.created || null, disabled: !!u.disabled, admin: isAdmin(u), invitedBy: u.invitedBy || null },
      unit: S.unit || 'kg',
      lastSync: S._ts || null,
      routines: (S.routines || []).map(r => ({ id: r.id, name: r.name, emoji: r.emoji, count: (r.ex || []).length })),
      bodyweight: S.bodyweight || [],
      workouts: (S.workouts || []).slice().reverse()   // newest first for display
    });
  },

  'POST /api/admin/user/disable': async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const body = await readBody(req);
    const u = db.users.find(x => x.id === body.id);
    if (!u) return json(res, 404, { error: 'no such user' });
    if (isAdmin(u)) return json(res, 400, { error: 'cannot disable an admin' });
    u.disabled = !!body.disabled;
    if (u.disabled) presence.delete(u.id);   // drop them off "training now" at once
    saveDb();
    json(res, 200, { ok: true, id: u.id, disabled: u.disabled });
  },

  /* ---------- marketplace moderation (ADR-0008) ---------- */
  'GET /api/admin/coach-apps': async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const apps = db.coachProfiles.map(p => {
      const u = db.users.find(x => x.id === p.uid) || {};
      return {
        uid: p.uid, name: u.name || p.uid, email: u.email || null,
        status: p.status, bio: p.bio || '', certs: p.certs || '',
        tags: p.tags || [], modality: p.modality || 'both', langs: p.langs || [],
        rate: p.rate || '', contact: p.contact || {}, avatarV: p.avatarV || 0,
        updated: p.updated || null,
      };
    });
    json(res, 200, { apps });
  },

  'POST /api/admin/coach-decision': async (req, res) => {
    const admin = requireAdmin(req, res); if (!admin) return;
    const body = await readBody(req);
    const p = db.coachProfiles.find(x => x.uid === String(body.uid || ''));
    if (!p) return json(res, 404, { error: 'no such application' });
    const decision = String(body.decision || '');
    if (!['approved', 'rejected', 'hidden'].includes(decision)) {
      return json(res, 400, { error: 'decision must be approved | rejected | hidden' });
    }
    p.status = decision;
    p.decided = new Date().toISOString();
    // approval grants the coach capability (ADR-0007 linking); rejection/hiding takes it back
    const u = db.users.find(x => x.id === p.uid);
    if (u && !isAdmin(u)) u.role = decision === 'approved' ? 'coach' : undefined;
    saveDb();
    json(res, 200, { ok: true, uid: p.uid, status: p.status });
  },

  'GET /api/admin/invites': async (req, res) => {
    if (!requireAdmin(req, res)) return;
    // resolve usedBy uid → name for display
    const invites = db.invites.map(i => ({
      ...i, usedByName: i.usedBy ? (db.users.find(u => u.id === i.usedBy) || {}).name || null : null
    }));
    json(res, 200, { invites, invite_only: INVITE_ONLY });
  },

  'POST /api/admin/invites/new': async (req, res) => {
    const admin = requireAdmin(req, res); if (!admin) return;
    const body = await readBody(req);
    let code;
    // 16 hex chars = 64 bits, up from 8 chars / 32 bits. The app has no rate limiting by design
    // (that's the reverse proxy's job) and /api/register/options tells a caller whether a code is
    // good, so the code itself has to be the thing that isn't worth guessing. Codes already in
    // db.json keep working — validation is an exact string compare, never a length or format check.
    do { code = crypto.randomBytes(8).toString('hex').toUpperCase(); } while (db.invites.some(i => i.code === code));
    const invite = { code, note: String(body.note || '').slice(0, 60), createdBy: admin.id, created: new Date().toISOString() };
    db.invites.push(invite);
    saveDb();
    json(res, 200, { invite });
  },

  'POST /api/admin/invites/revoke': async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const body = await readBody(req);
    const inv = db.invites.find(i => i.code === String(body.code || '').toUpperCase());
    if (!inv) return json(res, 404, { error: 'no such code' });
    if (inv.usedBy) return json(res, 400, { error: 'already used — cannot revoke' });
    db.invites = db.invites.filter(i => i.code !== inv.code);
    saveDb();
    json(res, 200, { ok: true });
  }
};

/* ---------- static frontend serving (single-service deployment) ---------- */
const PUBLIC_DIR = path.join(path.dirname(url.fileURLToPath(import.meta.url)), 'public');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
function serveStatic(res, filePath) {
  const abs = path.join(PUBLIC_DIR, filePath);
  if (!abs.startsWith(PUBLIC_DIR) || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) return false;
  res.writeHead(200, { 'Content-Type': MIME[path.extname(abs)] || 'application/octet-stream' });
  fs.createReadStream(abs).pipe(res);
  return true;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const key = req.method + ' ' + url.pathname;
  const handler = routes[key];

  // CORS: only allow same-origin requests (the nginx proxy adds no Origin header for
  // same-origin, so a missing Origin is fine — a mismatched Origin is rejected)
  const origin = req.headers.origin;
  if (origin && origin !== ORIGIN) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'origin not allowed' }));
  }

  // rate limiting per IP
  const isAuth = AUTH_PATHS.some(p => url.pathname.startsWith(p));
  const isExempt = RATE_EXEMPT.some(p => url.pathname === p);
  if (!isExempt && !rateLimit(req, isAuth)) {
    res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '60' });
    return res.end(JSON.stringify({ error: 'too many requests — try again in a minute' }));
  }

  // security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');

  if (!handler) {
    // serve static frontend for non-API GET requests (single-service deployment).
    // decode %XX escapes so assets with spaces (e.g. "giwi neutral-*.svg") resolve;
    // serveStatic's PUBLIC_DIR prefix check blocks any ../ traversal after decoding.
    let decoded = url.pathname;
    try { decoded = decodeURIComponent(url.pathname); } catch {}
    if (req.method === 'GET' && serveStatic(res, decoded)) return;
    if (req.method === 'GET' && serveStatic(res, 'index.html')) return;
    return json(res, 404, { error: 'not found' });
  }
  try { await handler(req, res); }
  catch (e) {
    console.error(key, e);
    if (!res.headersSent) json(res, 500, { error: 'server error' });
  }
});
server.listen(PORT, () => console.log(`gym-api on :${server.address().port} (rpID=${RP_ID}, origin=${ORIGIN})`));
