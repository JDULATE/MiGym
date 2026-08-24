# Deploy MiGym with a free .US.KG domain

Free domain from [DigitalPlat FreeDomain](https://github.com/DigitalPlatDev/FreeDomain).

## 1. Register your .US.KG domain (5 min)

1. Go to [https://dash.domain.digitalplat.org](https://dash.domain.digitalplat.org)
2. Create an account (email verification required)
3. Click **Register a domain**
4. Search for your desired name (e.g. `migym`)
5. Choose the **.US.KG** extension → it's free
6. Complete registration

## 2. Deploy to Render.com (10 min)

1. Push this repo to your GitHub (already done: https://github.com/JDULATE/MiGym)
2. Go to [render.com](https://render.com) → sign in with GitHub
3. **New** → **Blueprint** → select `MiGym`
4. Fill env vars:
   - **RP_ID**: your domain (e.g. `migym.us.kg`)
   - **ORIGIN**: `https://migym.us.kg`
5. **Apply** → wait 3–5 minutes

Render gives you free HTTPS + auto-deploy on push + 1 GB persistent disk.

## 3. Connect your domain (5 min)

1. In Render, go to your service → **Settings** → **Custom Domains**
2. Add your domain (e.g. `migym.us.kg`)
3. Render shows you a CNAME target — copy it
4. Go back to the DigitalPlat dashboard → your domain → **DNS settings**
5. Set custom nameservers OR add DNS records:
   - **CNAME** | `@` | `<the render target>`
6. Wait 5–30 minutes for DNS propagation

## 4. Verify (2 min)

- Visit `https://migym.us.kg` → MiGym loads with HTTPS
- Create a passkey profile (your domain is in RP_ID ✓)
- Log a workout → check it persists
- Open from your phone → same data

## 5. Android APK

Install `migym-debug.apk` on your phone → Settings ▸ Sync & backup ▸ Link to existing profile → sign in. Data syncs.
