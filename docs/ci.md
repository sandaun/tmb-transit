# Continuous Integration

## Toolchain

- Node.js 22 is the supported runtime. Run `nvm use` before installing dependencies.
- npm is the package manager for both the app and the API.
- The app and API have independent lockfiles and both CI jobs use `npm ci`.

## Local checks

Run the app checks with a non-local preview configuration:

```bash
EXPO_PUBLIC_APP_ENV=preview \
EXPO_PUBLIC_API_BASE_URL=https://api.example.invalid \
EXPO_PUBLIC_USE_MOCK=false \
npm run ci:app
```

Run the API checks with:

```bash
npm ci --prefix services/api
npm run ci:api
```

Run the complete repository lint with:

```bash
npm run lint
```

## GitHub checks

Pull requests to `main` run these required checks:

- `App`: Expo dependency validation, lint, TypeScript, unit tests, and an iOS bundle.
- `API`: lint, TypeScript, unit tests, and a production TypeScript build.
- `Dependency review`: rejects newly introduced high or critical vulnerabilities.
- `Analyze JavaScript and TypeScript`: CodeQL static analysis.

Workflow permissions default to read-only. Pull request workflows do not receive application or API
secrets. Third-party Actions are pinned to immutable commit SHAs.

## Main branch settings

After the workflows have run on `main` at least once, configure a GitHub ruleset with:

- Pull requests required before merging.
- Required checks: `App`, `API`, `Dependency review`, and `Analyze JavaScript and TypeScript`.
- Squash merge enabled.
- Force pushes and branch deletion disabled.
- Branches required to be up to date before merging.
- No mandatory reviewer while the repository has a single maintainer.

Do not mark a check as required until it has completed successfully at least once on GitHub.
