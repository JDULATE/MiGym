<div align="center">

# MiGym

**Tu entrenamiento. Tus pesos. Tus datos.**

Un app de fitness open source, local-first. Basada en [openGym](https://github.com/DuarteSantos8/openGym) por Duarte Santos (AGPL-3.0).

[![License: AGPL v3](https://img.shields.io/badge/license-AGPL--3.0-a3e635?style=flat-square)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-installable-a78bfa?style=flat-square)](docs/DEPLOYMENT.md)
[![Tests](https://img.shields.io/badge/tests-422%20passing-brightgreen?style=flat-square)]

</div>

---

## What is MiGym?

MiGym is a self-hosted fitness tracker that runs entirely on your device.
Plan your week, run guided workouts, track every set, and understand your progress —
without accounts, subscriptions or telemetry.

Built on top of [openGym](https://github.com/DuarteSantos8/openGym), redesigned with
its own identity, onboarding, adaptive suggestions and AI coach (opt-in).

## Features

- 🏋️ **Guided workouts** — today's plan, weight prefill, rest timer, PR detection
- 📊 **Progress overview** — volume, momentum, PRs, adaptive suggestions
- 🧠 **Adaptive training** — deterministic, explainable recommendations
- 📚 **Exercise library** — 1,324 exercises with animations, movement filters, alternatives
- 🔁 **Progression engine** — linear, Greyskull, double progression + deloads
- 📝 **RPE/RIR per set** — optional effort tracking
- 🔗 **Supersets** — plan them or pair them mid-session
- 📈 **Body weight** — chart with goal line, trend tracking
- 🌍 **12 languages** — full UI translation
- 📱 **PWA + Android** — installable, offline, local notifications
- 🔒 **Local-first** — everything on your device, no account required

## Quick start

```bash
git clone https://github.com/JDULATE/MiGym.git
cd MiGym
cp .env.example .env
docker compose up -d --build
```

Open **http://localhost:8080** — no login, no account. Giwi (the mascot) guides you through setup.

## Android

Download `migym-debug.apk` and install it on your phone.
Everything stays on the device — no server needed.

## Documentation

| Doc | Contents |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, tech stack, data model |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production guide: HTTPS, backups, monitoring |
| [docs/DEPLOY-USKG.md](docs/DEPLOY-USKG.md) | Deploy with a free .US.KG domain |
| [docs/SECURITY-AUDIT.md](docs/SECURITY-AUDIT.md) | Security audit results |
| [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) | Design tokens, colours, motion |
| [docs/MASCOT.md](docs/MASCOT.md) | Giwi mascot architecture |
| [docs/ONBOARDING.md](docs/ONBOARDING.md) | First-launch flow |
| [docs/TUTORIAL.md](docs/TUTORIAL.md) | Walkthrough engine |

## License

[AGPL-3.0](LICENSE) — free and open source. Based on
[openGym](https://github.com/DuarteSantos8/openGym) by Duarte Santos.
Exercise data from [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset)
(separate terms — see [NOTICE.md](NOTICE.md)).
