# TMB Transit MVP

Expo React Native MVP for Barcelona metro with:
- Metro line/station catalog
- Station arrivals via iMetro
- Estimated vehicle positions (ETA-based simulation, no GPS)
- Thin Fastify proxy backend with short cache and single-flight dedupe

## Project layout

- `/Users/oriolcarbo/code/Projectes/tmb-transit/app` Expo Router routes
- `/Users/oriolcarbo/code/Projectes/tmb-transit/src/domain` pure domain logic
- `/Users/oriolcarbo/code/Projectes/tmb-transit/src/data` API client, DTO mapping, cache
- `/Users/oriolcarbo/code/Projectes/tmb-transit/src/features` screen features and hooks
- `/Users/oriolcarbo/code/Projectes/tmb-transit/services/api` Fastify proxy

## Mobile setup

1. Install dependencies:

```bash
npm install
```

2. Start Expo:

```bash
npm run start
```

3. Set backend URL for device/simulator:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001 npm run start
```

If you run on a physical device, use your LAN IP instead of `localhost`.

## Frontend env and mock mode

The app reads frontend flags from env via `/Users/oriolcarbo/code/Projectes/tmb-transit/src/config/app-config.ts`.

Current flags:
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_USE_MOCK`

Recommended setup:
- `.env.development` (shared defaults for dev)
- `.env.local` (personal overrides, ignored by git)

For predictable behavior, use `.env.local` as the source of truth for local mode:

```bash
cp .env.local.example .env.local
```

Set:
- `EXPO_PUBLIC_USE_MOCK=true` for mock mode
- `EXPO_PUBLIC_USE_MOCK=false` for real backend mode

Then start with:

```bash
npm run start
```

If you need to reset Metro cache, run:

```bash
npx expo start --clear
```

## Backend setup

1. Install backend dependencies:

```bash
npm --prefix ./services/api install
```

2. Configure env:

```bash
cp ./services/api/.env.example ./services/api/.env
```

Fill:
- `TMB_APP_ID`
- `TMB_APP_KEY`

Optional:
- `TMB_TRANSIT_BASE_URL` (default `https://api.tmb.cat/v1/transit`)
- `TMB_IMETRO_BASE_URL` (default `https://api.tmb.cat/v1/itransit`)

3. Run backend:

```bash
npm run api:dev
```

## API exposed by backend

- `GET /health`
- `GET /v1/catalog/metro/lines`
- `GET /v1/catalog/metro/lines/:lineCode/stations`
- `GET /v1/catalog/metro/lines/:lineCode/segments`
- `GET /v1/realtime/metro/arrivals?lineCode={lineCode}&stationCode={stationCode}`

## ETA vehicle simulation

Implemented in `/Users/oriolcarbo/code/Projectes/tmb-transit/src/domain/realtime/estimate-vehicles.ts`:

- ordered stations per direction
- `avgSegmentSec = 90` (configurable)
- `segmentsBehind = floor(etaSec / avgSegmentSec)`
- `progress = 1 - ((etaSec % avgSegmentSec) / avgSegmentSec)`
- `segmentIndex = targetStationIndex - segmentsBehind - 1`
- no render when `segmentIndex < 0`

UI label shown on station screen:

`Estimated position (based on ETA).`

## Realtime cache strategy (backend)

Implemented in `/Users/oriolcarbo/code/Projectes/tmb-transit/services/api/src/routes/realtime.ts`:

- cache key: `arrivals:{lineCode}:{stationCode}`
- fresh TTL: `8s`
- single-flight dedupe: one upstream request per key while in flight
- stale fallback: return last value up to `30s` when upstream fails

## Tests

Backend unit test included for cache behavior:

```bash
npm --prefix ./services/api run test
```
