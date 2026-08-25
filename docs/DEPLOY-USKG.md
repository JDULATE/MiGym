# Deploy MiGym — Render.com + dominio gratuito DigitalPlat

Guía real y verificada con el deploy en producción:
**https://www.migym.dpdns.org** (agosto 2026).

Stack: contenedor Docker single-service en Render (plan Free) + dominio
`migym.dpdns.org` registrado gratis en [DigitalPlat FreeDomain](https://github.com/DigitalPlatDev/FreeDomain).

> **Plan Free de Render = SIN disco persistente.** Los datos del servidor
> (`/data`) se pierden cuando el servicio se reinicia. MiGym es local-first
> (ADR-0005): los dispositivos conservan todo; solo los snapshots de
> sincronización y las parejas de coach son efímeros. Para persistencia real,
> upgrade a Starter o migra a un VPS siempre-gratis (Oracle Cloud Always Free).

## 1. Dominio gratuito (DigitalPlat) — 10 min

1. Ve a <https://dash.domain.digitalplat.org> → crea cuenta (verifica email).
   Si el panel no resuelve, cambia el DNS de tu navegador a Cloudflare
   (`1.1.1.1`) — algunos ISP no resuelven `dash.domain.digitalplat.org`.
2. **Register a domain** → busca tu nombre (ej. `migym`) → elige extensión
   (`.DPDNS.ORG`, `.US.KG`, etc., todas gratuitas) → completa el registro.
3. Espera a que el **Status** del dominio diga `Active` (antes está en
   `Provisioning`; mientras tanto el panel rechaza crear registros DNS con
   error 403).

### Registro DNS correcto (importante)

La raíz del dominio **no admite CNAME** (`CNAME records cannot be created at
the zone apex`) → usa un subdominio `www`:

| Type | Name | Value | TTL |
|---|---|---|---|
| CNAME | `www` | `<tu-servicio>.onrender.com.` | 3600 |

Dos trampas conocidas:

* El valor debe terminar en **punto final** — si falta, DigitalPlat concatena
  tu zona y crea un registro roto tipo `migym.onrender.com.migym.dpdns.org`.
  Verifícalo después de guardar.
* Passkeys quedan ligadas al dominio que pongas en `RP_ID`. Elegimos
  `www.migym.dpdns.org` como dominio definitivo.

## 2. Web Service en Render — 10 min

1. <https://render.com> → sign in with GitHub → **New + → Web Service**
2. Selecciona el repo `JDULATE/MiGym`, branch `main`
3. Configuración:
   * **Language**: Docker · **Dockerfile Path**: `./Dockerfile`
   * **Instance Type**: Free
   * **Health Check Path**: `/api/health`
4. Environment variables:

   | Key | Value |
   |---|---|
   | `RP_ID` | `www.migym.dpdns.org` |
   | `ORIGIN` | `https://www.migym.dpdns.org` |
   | `RP_NAME` | `MiGym` |
   | `DATA_DIR` | `/data` |

5. **Deploy Web Service** → espera el build (~5 min la primera vez)

## 3. Custom domain en Render — 2 min

Service → **Settings → Custom Domains → Add Custom Domain** →
`www.migym.dpdns.org` → **Verify**.

Si agregaste el dominio cuando el CNAME aún estaba mal, el certificado TLS
puede quedar atascado (el handshake falla con alerta SSL). Solución:
**elimina el custom domain y vuélvelo a agregar** — Render re-verifica el DNS
correcto y emite el certificado en ~1 minuto.

## 4. Qué sirve la app y qué el CDN

El contenedor NO incluye los ~140 MB de media de ejercicios. El Dockerfile
define `VITE_IMG_BASE` / `VITE_GIF_BASE` apuntando al CDN de jsDelivr del
dataset (mismas bases que usa el build móvil). Resultado: deploys ligeros y
las imágenes/GIFs cargan desde el CDN.

## 5. Mantener el servicio despierto (opcional pero recomendado)

Las instancias Free se duermen tras ~15 min sin tráfico; la siguiente visita
tarda ~50 s en arrancar. Un ping externo cada 5 minutos lo evita:

1. Crea cuenta gratis en <https://uptimerobot.com>
2. **Add New Monitor** → type `HTTP(s)`
3. URL: `https://www.migym.dpdns.org/api/health`
4. Interval: `5 minutes` → Save

## 6. Verificación final

- [ ] `https://www.migym.dpdns.org/api/health` → `{"ok":true,...}`
- [ ] La SPA carga con HTTPS y candado válido
- [ ] Crear cuenta con passkey funciona (dominio = RP_ID ✓)
- [ ] Imágenes y GIFs de ejercicios visibles (CDN)
- [ ] Giwi visible en onboarding/tutorial (assets con espacios en el nombre —
      el servidor decodifica `%20` desde el fix de `api/server.js`)

## 7. Gestión vía API / MCP (opcional)

Con una API key de Render (Account Settings → API Keys) puedes gestionar el
servicio sin dashboard: variables de entorno, redeploys, logs, custom domains.
Notas de API aprendidas aquí:

* `PUT /v1/services/{id}/env-vars` reemplaza TODAS las variables y el body es
  un **array directo** `[{"key":...,"value":...}]` — sin envoltorio.
* Cambiar env vars requiere disparar redeploy:
  `POST /v1/services/{id}/deploys` con body `{"clearCache":"do_not_clear"}`.
* opencode tiene el MCP oficial configurado (`https://mcp.render.com/mcp`,
  header `Authorization: Bearer ${RENDER_API_KEY}`).
