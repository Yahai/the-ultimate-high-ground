# THE ULTIMATE HIGH GROUND

**Dominate the final frontier.**

An **unofficial, fictional** Nigeria-focused, browser-based 3D space-strategy game. The player starts with a public-source November 2026 baseline and makes strategic investments in communications, Earth observation, radar, maritime awareness, research, and launch science.

> **Prototype — not an operational system.** All budgets, military threats, spacecraft fuel, telemetry, sensor footprints, coverage values and game outcomes are simulated. Neither the game nor its source represents live military intelligence or operational targeting.

## Live game

**https://yahai.github.io/the-ultimate-high-ground/**

## Play

Open the deployed `index.html` on GitHub Pages. Click **Enter War Room** (or **Continue Campaign**, if you have a locally saved game).

- **Mouse / trackpad:** rotate, zoom and pan in the 3D scene.
- **Presets:** War Room 3D, Orbit View, Abuja HQ, North-East, North-West, Niger Delta.
- **Labels / Overlays:** declutter the holographic terrain, hide orbital tracks and control tactical layers.
- **Inspect:** select satellites, stations, theatres, and fictional training contacts to see dossiers and available actions.
- **Orbital playback:** spacecraft animation is independent of the strategic turn clock. GEO remains Earth-fixed; LEO spacecraft follow inclined propagated paths.
- **Quarterly strategic turns:** the campaign runs from Q4 2026 through Q3 2036. Choose between domestic R&D, future spacecraft procurement, contracted imagery, network upgrades and maintenance.
- **Real dependencies:** R&D takes multiple quarters, future satellites require ground-network capacity before commissioning, and every commissioned spacecraft adds ongoing operating costs.
- **Strategic events:** mandatory fictional emergencies demand a choice before the next turn; decisions affect confidence, funding, reliability and research.
- **Mission Control (v0.6):** commission an optical, radar or maritime spacecraft; open **MISSIONS**; choose an exercise region and see the next 14 days of physically propagated orbital pass opportunities. Queue observation requests, advance a strategic quarter, and see downlinked data products. Analyse each delivered product for intelligence confidence and short-lived coverage benefits.
- **Ground constraints:** a physically eligible satellite pass still needs a geometrically visible receiving opportunity, spare network capacity, and functioning infrastructure. Optical acquisitions can fail due to synthetic cloud conditions; SAR and AIS avoid optical cloud failures.
- **Mission replays (v0.6):** preview an eligible observation from Mission Control, with orbital playback following a simulated observation and downlink window. The receiving-network panel displays hypothetical station capabilities, congestion and health.
- **Strategic portfolio (v0.8):** Fund up to two of three long-range national projects concurrently. Projects spend capital immediately, take multiple quarters to complete, then incur recurring upkeep. An emergency-data exchange improves resilience and incident decisions; a data-fusion backbone adds processing and reception capacity; an integration academy reduces future spacecraft research times.
- **Milestone grants:** Deliver infrastructure and combine it with real campaign achievements to earn three one-time programme grants. New crisis events diversify the mid-to-late-game turn sequence.
- **UI copy:** Repetitive disclaimer labels were removed from the playable HUD. A single independent-game disclosure and source notes remain in the information screens.
- **Operation First Light (v0.7):** new campaigns open with a guided fictional civilian flood-response exercise. Inspect Niger Delta, use an existing partner imagery credit, purchase a civilian resilience package, advance to Q1 2027, and choose a national response. The debrief grades preparedness and the response choice, and changes simulated support and risk. The tutorial can be hidden or skipped without preventing free play. **Existing v0.6 saves automatically bypass the tutorial** and retain pending strategic decisions; starting a new campaign is the opt-in route to First Light.
- **Replayability:** the completed First Light debrief remains accessible after reload; replaying it starts a brand-new campaign and requests confirmation.
- **Mobile landscape cockpit:** phone gameplay offers touch orbit/zoom, a compact bottom control dock, device rotation guidance and a fullscreen toggle. Where supported, entering the game requests browser fullscreen and landscape orientation; on iPhone/Safari the browser may not allow forced rotation or fullscreen. The portrait fallback is optional.
- **Home-screen app:** Chrome/Android can add the page to the home screen; the app manifest requests landscape/fullscreen on launch. This static app still needs an internet connection for its CDN-hosted libraries.
- **Coverage vs. threats:** regional operational coverage depends on modelled capacity **and recent analysed products**, not on threat-pressure scores. An observation never directly neutralizes a threat.

Your campaign autosaves in **this browser's localStorage** and returns when you revisit from the same browser profile. It does **not** sync across devices. Removing website data resets the local save.

## Run locally

A local HTTP server is required for browser ES modules. From this directory, run:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. Alternatively use VS Code Live Server or any standard static web server.

## Automated checks

Requires Node.js 18+ (no npm installation needed):

```bash
node --check assets/game.js
node --check assets/strategy.mjs
node --check assets/orbital.mjs
node tests/smoke.cjs
node tests/orbital.test.mjs
node tests/strategy.test.mjs
node tests/mission.test.mjs
node tests/replay.test.mjs
node tests/first_light.test.mjs
node tests/portfolio.test.mjs
python tests/browser_e2e.py    # Chromium full-game E2E; requires CDN connectivity
python tests/mobile_layout.py  # optional: requires playwright + Chromium
```

These check syntax, deployment assets, GEO station keeping, LEO propagation, mission-pass forecasts, receiving visibility, tasking constraints, downlink results and data-product analysis. They do **not** replace real-browser functional testing or performance profiling.

## Publish on GitHub Pages

1. Create a **public** repository named `the-ultimate-high-ground` in your GitHub account. Initialize it with `README.md` so the `main` branch exists.
2. Commit this project's files to the root of `main` (including the hidden `.nojekyll` file and the `assets/` directory). If a README already exists, replace it with this version.
3. In the repository open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**, choose **main**, choose **/(root)**, then **Save**.
5. GitHub Pages will publish at `https://<username>.github.io/the-ultimate-high-ground/` once the Pages build finishes. Check the Pages settings for the actual live URL and deployment status.

All local links are relative, so deployment works from a project subpath (`/the-ultimate-high-ground/`) rather than requiring domain root ownership.

## Structure

```text
index.html                HTML entry point and import map
assets/
  game.js                 React strategy UI and Three.js rendering, using shared orbital state
  orbital.mjs             Pure orbital propagator, pass forecasting and ground visibility
  strategy.mjs            Quarterly economy, R&D, mission tasking, observation products, and victory logic
  site.css                App styles and responsive layouts
  war-room.jpg            Original generated splash artwork
  satellite-hero.jpg      Original generated spacecraft artwork
  satellite-dossier.jpg   Original generated spacecraft artwork
  favicon.svg             Site icon
.nojekyll                 Publish static files without Jekyll processing
.github/workflows/check.yml
                          Automated syntax and orbital tests
tests/smoke.cjs           Static deployment and integration checks
tests/orbital.test.mjs    Propagation, geometric passes and receiver availability
tests/strategy.test.mjs   Quarterly economy and campaign regression tests
tests/mission.test.mjs    End-to-end mission planning and intelligence production
tests/first_light.test.mjs   Opening scenario and save migration
tests/browser_e2e.py       Full browser First Light playthrough
```

### Technical notes

- Three.js 0.160, React 18 and Lucide icons load from CDNs at runtime. Internet access is required when you first open the game.
- LEO trajectories use circular Keplerian approximations with a simplified J2 nodal-rate correction, rotating into Earth-fixed coordinates; they are not TLE/SGP4 satellite tracking.
- GEO is fixed at the documented nominal `42.5°E` slot. The globe and tabletop use the same simulated Earth-centred state.
- Altitudes and distances are **visually exaggerated/compressed** for tabletop legibility. These are not scale models of Earth-orbit separation.
- Future spacecraft are fictional / proposed until unlocked by the player. Their orbital elements are gameplay assumptions, not current ephemerides.
- Procedural terrain is stylized; it is not a surveyed elevation or high-resolution geospatial dataset.
- Mission forecasts use invented circular orbital elements and approximate footprints, with a 14-day representative observation window per quarterly turn. The geometry does **not** use verified orbital elements, real weather, ground-station schedules or targeting data.
- The 2026 baseline references are included in the game's Source Notes / dossiers and should be reviewed before future releases.

## Project status

**Prototype v0.8:** Shared physical orbital model between both 3D views and mission planning; spacecraft pass forecasts over broad fictional exercise regions; geocentric ground-receiver visibility; queued mission requests; capacity- and health-constrained downlinks; optical cloud scenarios; acquired products; subsequent intelligence analysis; capability and actual delivered observations as distinct coverage measurements; automatic V2 → V3 local save migration; regression tests and GitHub Pages deployment.

**Next:** reconcile browser-test findings, improve first-session choice explanations, optimize frame-time and WebGL startup, then deepen mission data queues and campaign pacing.

**Automated checks:** Unit/syntax tests, First Light gameplay regression, a full Chromium introduction playthrough on GitHub Actions, plus a Playwright mobile CSS layout check at 844×390, 667×375 and 390×844. The mobile test isolates CSS from the game runtime because local browser navigation is blocked in the current development environment. It does not certify full-screen/orientation permissions on particular devices. GitHub Actions validates each release.

**Not affiliated with or endorsed by Nigeria's Defence Space Administration, NASRDA, NIGCOMSAT, or the Armed Forces.**

## Release v0.8 — Strategic Depth

**Design intent:** Long-term capital commitments compete with spacecraft commissioning and routine maintenance. Investment returns happen through observable model changes, not instant score inflation. New projects have construction lead times, permanent upkeep and mechanical synergies with crisis choices, orbital data operations and R&D qualification. Project funding and one-time milestone awards are saved across sessions.

**User-facing copy:** This is clearly a strategy game; avoid repetitive simulation/legal warnings in the interface. Keep the independent-game disclosure and accuracy qualifications in the introductory information and Sources panel. Satellite status remains explicit (in service vs planned vs concept) so the game does not imply nonexistent spacecraft are active.

**Tests:** Includes a strategic portfolio regression suite, First Light campaign, orbital geometry, mission processing, mobile layout and browser playthrough. The browser test also validates that funding an emergency-data project costs the correct amount and persists in the campaign save.

**Next:** Live play balancing, mission and network backlog realism, event consequences conditioned by progress, better mobile discovery of investment portfolio, and simplified asset descriptions.