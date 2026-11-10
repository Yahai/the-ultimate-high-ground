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
- **Coverage vs. threats:** modeled Earth-observation coverage is distinct from regional threat pressure. Imagery improves analysis confidence; funding separate interventions is required to change pressure.

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
node tests/smoke.cjs
node tests/strategy.test.mjs
```

These check syntax, deployment assets, GEO Earth-fixed behavior, LEO movement, and non-horizontal tabletop orbital geometry. They do **not** replace real-browser functional testing or performance profiling.

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
  game.js                 React strategy UI, Three.js rendering & orbital simulation
  strategy.mjs            Pure quarterly economy, R&D, coverage, event choices and victory logic
  site.css                App styles and responsive layouts
  war-room.jpg            Original generated splash artwork
  satellite-hero.jpg      Original generated spacecraft artwork
  satellite-dossier.jpg   Original generated spacecraft artwork
  favicon.svg             Site icon
.nojekyll                 Publish static files without Jekyll processing
.github/workflows/check.yml
                          Automated syntax and orbital tests
tests/smoke.cjs           Dependency-free orbital regression checks
tests/strategy.test.mjs   Pure simulation regression tests
```

### Technical notes

- Three.js 0.160, React 18 and Lucide icons load from CDNs at runtime. Internet access is required when you first open the game.
- LEO trajectories use circular Keplerian approximations with a simplified J2 nodal-rate correction, rotating into Earth-fixed coordinates; they are not TLE/SGP4 satellite tracking.
- GEO is fixed at the documented nominal `42.5°E` slot. The globe and tabletop use the same simulated Earth-centred state.
- Altitudes and distances are **visually exaggerated/compressed** for tabletop legibility. These are not scale models of Earth-orbit separation.
- Future spacecraft are fictional / proposed until unlocked by the player. Their orbital elements are gameplay assumptions, not current ephemerides.
- Procedural terrain is stylized; it is not a surveyed elevation or high-resolution geospatial dataset.
- The 2026 baseline references are included in the game's Source Notes / dossiers and should be reviewed before future releases.

## Project status

Prototype v0.4: corrected orbital simulation, modular strategy economy, quarterly project pipeline, recurring operations, ground-network gating, separate coverage and threat-pressure metrics, deterministic strategic events, scoring, victory/defeat, V1 save migration and GitHub Pages-ready source.

Planned next: reproducible browser integration tests, first-turn tutorial, modular orbital physics, improved accessibility, orbital speed selector, audited public geographic data, campaign balancing, and performance profiling.

**Not affiliated with or endorsed by Nigeria's Defence Space Administration, NASRDA, NIGCOMSAT, or the Armed Forces.**