# Deploy MiGym with a free .US.KG domain — step-by-step guide

## 1. Get your free .US.KG domain

1. Go to [https://www.us.kg](https://www.us.kg) and create an account
2. Click **Register a domain** → search for your desired name (e.g. `migym`)
3. Choose the `.US.KG` extension → it's free
4. Complete registration (requires identity verification for anti-abuse)

## 2. Deploy to Render.com (free tier)

1. Push this repository to your GitHub account
2. Go to [https://render.com](https://render.com) → sign in with GitHub
3. Click **New** → **Blueprint** → select your repository
4. Render reads `render.yaml` automatically
5. Fill in the environment variables:
   - `RP_ID`: your domain (e.g. `migym.us.kg`)
   - `ORIGIN`: `https://migym.us.kg`
6. Click **Deploy**

Render gives you: free HTTPS, auto-deploy on push, persistent 1 GB disk.

### Alternative: Railway.app

1. Go to [https://railway.app](https://railway.app) → sign in with GitHub
2. **New Project** → **Deploy from repo**
3. Add a persistent volume mounted at `/data`
4. Set env vars: `RP_ID`, `ORIGIN` (use the Railway domain or your .US.KG)
5. Railway gives you a `*.up.railway.app` domain + free HTTPS

## 3. Point your .US.KG domain

In your .US.KG dashboard, add DNS records:

| Type | Name | Value |
|---|---|---|
| A | @ | (your hosting service's IP) |
| CNAME | www | (your hosting service's domain) |

For Render: use the CNAME target shown in your Render dashboard (e.g. `migym-xxxx.onrender.com`).
DNS propagation takes 5–30 minutes.

## 4. Verify

1. Visit `https://your-domain.us.kg` — MiGym loads
2. Create a profile with a passkey (your domain is in the RP_ID, so passkeys work)
3. Add a workout, check it persists
4. Visit from your phone — same profile, same data

## 5. Android APK

The debug APK is at `migym-debug.apk` in the project root. Install it on your phone,
then link it to your server profile in Settings ▸ Sync & backup. Your data syncs.
