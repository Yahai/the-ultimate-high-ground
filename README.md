# THE ULTIMATE HIGH GROUND
**Dominate the final frontier.**

A browser-based 3D strategy-game prototype set in a fictional future Nigerian defence-space simulation. The public-source November 2026 baseline supports a turn-based campaign in which the player develops sovereign communications, Earth observation, maritime awareness and research infrastructure.

## Play online
Once GitHub Pages is enabled, visit:
https://yahai.github.io/the-ultimate-high-ground/

Or clone the repository and serve it locally:
```bash
python3 -m http.server 8000
```
Open http://localhost:8000/.

## Current features
- Three.js Nigeria holographic command tabletop and Earth-orbit view.
- Modelled inclined LEO trajectories and approximately Earth-fixed GEO positioning.
- Orbital playback independent from campaign turns.
- Inspectors for spacecraft, theatres, and ground infrastructure.
- Strategic investments, research upgrades, simulated crises and turn progression.
- Camera presets, overlays, label declutter, and local campaign autosave.

## Engineering
The initial release deliberately packages HTML, CSS, JavaScript, imagery and the orbital model into `index.html`, so it can deploy through GitHub Pages without a build system. React, Three.js and icon libraries are loaded from public CDNs and require internet access. For development, a modularized local source archive is available in the original ChatGPT project conversation.

## Factual integrity
**Unofficial, independently created, fictional game.** It is **not** affiliated with, approved by, or operated by the Defence Space Administration, NASRDA, NIGCOMSAT, or the Nigerian Armed Forces. It provides no live intelligence or operational targeting. Threats, programmes, budgets, telemetry, positions and game outcomes are simulated. Hypothetical future assets are not represented as actual current Nigerian spacecraft.

The orbital model is simplified for gameplay and does not use live ephemerides. Tabletop orbital distances and terrain elevations are exaggerated for legibility.

## Publish with GitHub Pages
Open **Settings → Pages** → **Build and deployment** → **Deploy from a branch** → choose `main` and `/(root)` → **Save**.

After deployment, test the game in a desktop browser with WebGL enabled.

## Next development priorities
1. Inspect the live runtime and repair any JavaScript/WebGL errors.
2. Extract the monolithic prototype into independently testable modules.
3. Add verified geographic geometry/elevation datasets and explicit asset-source provenance.
4. Extend game economy, strategic decisions, save schema and balancing.
5. Implement end-to-end browser tests and performance profiling.
