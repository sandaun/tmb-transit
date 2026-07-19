<div align="center">
  <img src="./assets/images/icon.png" alt="MouBCN app icon" width="120" />

  # MouBCN

  **Barcelona in motion.**

  Explore Metro, bus, FGC, and TRAM lines, check live arrivals, follow service alerts,
  find nearby stops, and plan a route across the city.

  [![CI](https://github.com/sandaun/moubcn/actions/workflows/ci.yml/badge.svg)](https://github.com/sandaun/moubcn/actions/workflows/ci.yml)
  ![Expo SDK 54](https://img.shields.io/badge/Expo_SDK-54-000020?logo=expo&logoColor=white)
  ![React Native 0.81](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react&logoColor=111827)
  ![Node.js 22](https://img.shields.io/badge/Node.js-22-5FA04E?logo=node.js&logoColor=white)
</div>

> [!NOTE]
> MouBCN is an independent, unofficial project under active development. It is not
> affiliated with or endorsed by TMB, FGC, or TRAM Barcelona.

## What is inside

| | Feature | Details |
| --- | --- | --- |
| 🗺️ | Live network map | Browse lines, stations, interchanges, and vehicles on an interactive map. |
| 🚇 | One connected catalog | Metro, bus, FGC, and TRAM lines and stops in a consistent interface. |
| ⏱️ | Realtime arrivals | Live arrival data for Metro, bus, FGC, and TRAM, with scheduled fallbacks where available. |
| 📍 | Nearby stops | Find transport around the current location and filter it by mode. |
| 🧭 | Route planning | Choose an origin and destination on the map and compare route options. |
| ⚠️ | Service alerts | Combined current and scheduled notices from TMB, FGC, and TRAM. |
| ⭐ | Personal shortcuts | Save places, lines, and stops, and revisit recent journeys. |
| 🌗 | Made for the device | Catalan, Spanish, and English; light and dark themes; iOS and Android. |

The repository contains two applications:

```text
moubcn/
├── app/              Expo Router routes
├── src/
│   ├── domain/       Transport models and pure domain logic
│   ├── data/         API clients, mapping, and local caching
│   └── features/     Screens, components, hooks, and feature logic
└── services/api/     Fastify proxy for TMB, FGC, and TRAM data
```

The mobile app never receives provider credentials. It talks to the proxy, which normalizes the
different upstream APIs, protects credentials, rate-limits clients, and uses short-lived caches with
single-flight request deduplication.

## Quick start

### Requirements

- Node.js 22 (the repository includes an `.nvmrc`)
- npm
- Xcode for iOS or Android Studio for Android

### Run with mock data

Mock mode is the fastest way to explore the app and does not require API credentials.

```bash
nvm use
npm install
cp .env.local.example .env.local
npm run start
```

Keep `EXPO_PUBLIC_USE_MOCK=true` in `.env.local`, then open the project in an iOS simulator,
Android emulator, development build, or web browser from the Expo terminal.

Useful platform shortcuts:

```bash
npm run ios
npm run android
npm run web
```

If Metro holds stale state, restart it with `npx expo start --clear`.

## Run with live data

Live TMB and TRAM data require provider credentials. FGC Open Data does not require credentials.

1. Install the API dependencies and create its local environment file:

   ```bash
   npm install --prefix services/api
   cp services/api/.env.example services/api/.env
   ```

2. Add `TMB_APP_ID`, `TMB_APP_KEY`, `TRAM_CLIENT_ID`, and `TRAM_CLIENT_SECRET` to
   `services/api/.env`.

3. Point the app at the local API and disable mock mode in `.env.local`:

   ```dotenv
   EXPO_PUBLIC_APP_ENV=development
   EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
   EXPO_PUBLIC_USE_MOCK=false
   ```

4. Start the API and Expo in separate terminals:

   ```bash
   npm run api:dev
   ```

   ```bash
   npm run start
   ```

When running on a physical device, replace `localhost` with the computer's LAN IP address.

### Environment variables

| Variable | Used by | Purpose |
| --- | --- | --- |
| `EXPO_PUBLIC_APP_ENV` | App | Selects `development`, `preview`, or `production`. |
| `EXPO_PUBLIC_API_BASE_URL` | App | Base URL of the Fastify API. |
| `EXPO_PUBLIC_USE_MOCK` | App | Enables deterministic local mock data. |
| `PORT` | API | Listening port; defaults to `3001`. |
| `TMB_APP_ID` | API | Server-only TMB application identifier. |
| `TMB_APP_KEY` | API | Server-only TMB application key. |
| `TRAM_CLIENT_ID` | API | Server-only TRAM OAuth client identifier. |
| `TRAM_CLIENT_SECRET` | API | Server-only TRAM OAuth client secret. |
| `TRAM_OPEN_DATA_BASE_URL` | API | TRAM Open Data base URL. |

Preview and production builds require an explicit non-local HTTPS API URL and reject mock mode.
Every `EXPO_PUBLIC_*` value is included in the mobile bundle and must be treated as public.

## API surface

The proxy exposes a small normalized API:

| Endpoint | Description |
| --- | --- |
| `GET /health` | Service health check. |
| `GET /v1/catalog/:mode/lines` | Lines for `metro`, `bus`, `fgc`, or `tram`. |
| `GET /v1/catalog/:mode/lines/:lineCode/stations` | Stops on a line. |
| `GET /v1/catalog/:mode/lines/:lineCode/segments` | Line geometry. |
| `GET /v1/realtime/:mode/arrivals` | Realtime arrivals for a line and stop. |
| `GET /v1/realtime/fgc/vehicles` | FGC GeoTren vehicle positions. |
| `GET /v1/nearby/stops` | Nearby stops by coordinate, radius, and mode. |
| `GET /v1/planner/routes` | Route options between two coordinates. |
| `GET /v1/service-alerts` | Combined TMB, FGC, and TRAM service notices. |

Catalog data is cached for 24 hours. Realtime responses use a short cache and can fall back to a
recent stale value if an upstream service temporarily fails.

## Tech stack

- **App:** Expo, React Native, Expo Router, TypeScript, TanStack Query, Zustand, React Native Maps
- **API:** Fastify, Zod, TypeScript
- **Quality:** ESLint, Node test runner, Expo Doctor, CodeQL, Dependabot

## Quality checks

Run app checks:

```bash
npm run lint:app
npm run typecheck
npm test
```

Run API checks:

```bash
npm run lint:api
npm run api:typecheck
npm run api:test
npm run api:build
```

The complete CI commands are `npm run ci:app` and `npm run ci:api`. See
[Continuous Integration](./docs/ci.md) and [Security Operations](./docs/security.md) for repository
policies and deployment constraints.

The [App Store submission guide](./docs/app-store-submission.md) tracks the public privacy and
support pages, App Privacy answers, provider rights, and release blockers for iOS distribution.

## Data sources

- [TMB APIs](https://developer.tmb.cat/) for Metro and bus catalogs, arrivals, nearby stops, route
  planning, and service information.
- [FGC Open Data](https://dadesobertes.fgc.cat/) for FGC catalogs, realtime data, and service
  information.
- [TRAM Open Data](https://opendata.tram.cat/) for TRAM catalogs, GTFS-RT arrivals, and service
  alterations. The app displays the required “Powered by TRAM Barcelona” attribution in its data
  sources preferences.

Before publishing, replace the provisional TRAM attribution with the official certification logo
required by the TRAM Open Data reuse conditions.

Availability and accuracy depend on the upstream providers. Do not rely on this project as the only
source of information for time-critical journeys.

## License

No open-source license has been selected yet. Until a license file is added, the source code is
provided without permission to copy, modify, or redistribute it.
