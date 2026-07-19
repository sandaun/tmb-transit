# App Store submission guide

This document is the release checklist for publishing MouBCN as a free,
non-monetized app by an individual developer.

## Developer registration

- Enroll in the [Apple Developer Program](https://developer.apple.com/programs/enroll/) as an
  individual using the legal name that should appear as the App Store seller.
- An individual enrollment does not require incorporating a company or obtaining a D-U-N-S
  number. Apple still requires identity verification and the annual membership fee.
- Use `cat.oriol.moubcn` as the App ID and bundle identifier.
- In App Store Connect, complete agreements, tax, and banking sections only when Apple marks them
  as required for the chosen distribution and business model.
- For EU distribution, complete the
  [Digital Services Act declaration](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements).
  Select non-trader only while the app is genuinely published outside a trade, business, craft, or
  profession. Reassess this before adding subscriptions, ads, sponsorship, or other monetization.

No separate company registration is required merely to publish a free app as an individual.
Commercial or recurring professional activity can create separate Spanish tax and social-security
obligations, so reassess the setup before monetizing the app.

## Public URLs

GitHub Pages must deploy the `site/` directory from the `pages.yml` workflow. After merging, enable
GitHub Pages with **GitHub Actions** as the source in the repository settings and verify every URL:

| Locale | Privacy policy | Support | Data sources |
| --- | --- | --- | --- |
| Catalan | `https://sandaun.github.io/moubcn/ca/privacy/` | `https://sandaun.github.io/moubcn/ca/support/` | `https://sandaun.github.io/moubcn/ca/sources/` |
| English | `https://sandaun.github.io/moubcn/en/privacy/` | `https://sandaun.github.io/moubcn/en/support/` | `https://sandaun.github.io/moubcn/en/sources/` |
| Spanish | `https://sandaun.github.io/moubcn/es/privacy/` | `https://sandaun.github.io/moubcn/es/support/` | `https://sandaun.github.io/moubcn/es/sources/` |

The App Store Connect Privacy Policy URL and Support URL must be public, must not require login,
and must work before the build is submitted. Verify that messages sent to
`oriol.carbo+moubcn@gmail.com` reach the monitored inbox before publishing.

## App Store Connect metadata

- **Name:** MouBCN
- **Subtitle:** Barcelona in motion
- **Primary category:** Navigation
- **Secondary category:** Travel
- **Price:** Free
- **Copyright:** `2026 Oriol Carbó`
- **Privacy Policy URL:** use the locale-specific privacy URL above
- **Support URL:** use the locale-specific support URL above
- **Marketing URL:** optional; omit it until a dedicated product page exists
- **License agreement:** use Apple's standard EULA unless a custom agreement is reviewed
- **Age rating:** answer the questionnaire from the shipped feature set; do not infer the final
  rating in advance

Localize the app description, keywords, promotional text, privacy URL, and support URL in Catalan,
English, and Spanish. Avoid language that implies affiliation with TMB, FGC, or TRAM.

Suggested review note:

> MouBCN is an independent transport information app for Barcelona. It does not require an account,
> purchases, or background location. Location is optional and is requested only while the app is in
> use to center the map, show nearby stops, and plan routes. The Data Sources screen identifies TMB,
> FGC, and TRAM and links to their source and reuse information. Personal settings, favorites, and
> history are stored on the device and can be deleted from Settings.

## App Privacy answers

The current code is designed for the **Data Not Collected** selection because:

- no account, analytics SDK, advertising SDK, crash-reporting SDK, or tracking SDK is included;
- precise location is used for the requested feature and is not written to persistent storage;
- favorites, saved places, recent items, language, and theme remain on the device;
- the API rate limiter temporarily uses the request IP address in memory and the application logger
  excludes client addresses.

Do not select **Data Not Collected** until the production host, load balancer, CDN, monitoring, and
crash tooling have also been verified. If any layer retains IP addresses, precise coordinates,
diagnostics linked to a device, or identifiers beyond the immediate request, update both the App
Privacy answers and the privacy policy before submission.

The privacy policy must remain accessible in the app. MouBCN exposes it from Settings and provides
a complete local-data deletion action there.

## Permissions and platform configuration

- Location permission is limited to **While Using the App**.
- Background location and Always authorization are disabled.
- The location purpose string is localized in Catalan, English, and Spanish.
- `ITSAppUsesNonExemptEncryption` is set to `false` because the app does not implement non-exempt
  encryption itself.
- The app has no account system, so in-app account deletion is not applicable.
- The app supports iPad; supply iPad screenshots and test the layout before submission. If iPad is
  not part of the intended launch, explicitly change `supportsTablet` to `false` before building.

## Data-source and content-rights evidence

Keep a private release folder containing the provider terms, access approvals, API registration
emails, and the version/date reviewed for each source:

- **TMB:** developer account, credentials, and applicable API reuse terms.
- **FGC:** Open Data source and CC BY 4.0 attribution evidence.
- **TRAM:** Open Data registration, reuse conditions, and the official certification logo supplied
  by TRAM.

The in-app Data Sources screen and public source pages identify all three providers and state that
MouBCN is independent and unofficial. The current TRAM treatment is a text-and-logo attribution
using the repository asset. Replace it with the official certification artwork supplied by TRAM
before submission; this remains a release blocker.

Do not imply that provider trademarks endorse MouBCN. Use provider logos only to identify data
sources and only within the scope permitted by their terms.

## Release checklist

- [ ] Apple Developer individual enrollment is active and the legal seller name is correct.
- [ ] The App ID and App Store Connect record use `cat.oriol.moubcn`.
- [ ] GitHub Pages is enabled and all nine public localized pages return successfully.
- [ ] The support email alias has been tested from an external account.
- [ ] Production infrastructure logging has been audited against the privacy policy.
- [ ] App Privacy answers match the final build and deployed backend.
- [ ] TMB, FGC, and TRAM content-rights evidence is archived.
- [ ] The official TRAM certification logo has replaced the provisional attribution asset.
- [ ] Catalan, English, and Spanish metadata is complete.
- [ ] iPhone and iPad screenshots match the submitted build.
- [ ] Location denial, grant, and system-settings flows work on a physical device.
- [ ] Delete Personal Data clears favorites, saved places, recents, and map history.
- [ ] A production archive passes App Store validation and its privacy report is reviewed.
- [ ] The build is tested through TestFlight before review submission.

This checklist is operational guidance, not tax or legal advice. Recheck Apple requirements and
provider terms immediately before submission because they can change.
