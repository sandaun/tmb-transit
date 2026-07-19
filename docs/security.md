# Security Operations

## Environment boundaries

The mobile bundle treats every `EXPO_PUBLIC_*` value as public. Never place credentials or API keys
in those variables.

Supported mobile environments:

| Environment | API URL | Mock mode |
| --- | --- | --- |
| `development` | Local HTTP is allowed | Allowed |
| `preview` | Explicit non-local HTTPS URL | Rejected |
| `production` | Explicit non-local HTTPS URL | Rejected |

If `EXPO_PUBLIC_APP_ENV` is absent during a production Node build, the app fails closed as
`production`. TMB and TRAM credentials remain server-only variables in `services/api`.

## Location data in logs

The API accepts coordinates for nearby stops and route planning but does not persist them. Its
request serializer replaces these query values before writing logs:

- `lat` and `lon`
- `fromLat` and `fromLon`
- `toLat` and `toLon`

Logged errors contain only a sanitized name and message, without a stack. Do not add raw request
objects, URLs, coordinates, or upstream errors to logs without extending the redaction tests.

The request logger does not store client IP addresses or remote ports. The in-memory rate limiter
uses the client IP only for its one-minute request window and does not persist it. Production hosting
must disable or redact infrastructure request logs that retain IP addresses or location query values;
otherwise the App Store privacy declaration and public privacy policy must be updated before release.

## Dependency policy

- Dependabot checks the app and API lockfiles weekly.
- Dependency Review blocks new high and critical findings in pull requests.
- Run `npm audit` and `npm audit --prefix services/api` when changing dependencies.
- Never use `npm audit fix --force`; review major upgrades separately.

After the Phase 1 compatible updates, the API has no known high or critical findings. Its remaining
finding is a low-severity development dependency. The Expo SDK 54 tree retains moderate and low
toolchain findings whose npm-proposed fix is an Expo major upgrade. These are accepted temporarily;
new high or critical vulnerabilities remain blocked.

## Secret handling and rotation

Store `TMB_APP_ID`, `TMB_APP_KEY`, `TRAM_CLIENT_ID`, and `TRAM_CLIENT_SECRET` only in local ignored
files or the deployment platform's secret store. Never expose TRAM OAuth credentials through an
`EXPO_PUBLIC_*` variable. If a secret is exposed:

1. Revoke or rotate it at the provider immediately.
2. Remove it from the current tree and repository history when necessary.
3. Review GitHub, CI, and provider logs for use.
4. Update the secure secret store and redeploy affected services.
5. Document the incident and the control that prevents recurrence.

Enable GitHub secret scanning, push protection, the dependency graph, Dependabot alerts, and CodeQL.
