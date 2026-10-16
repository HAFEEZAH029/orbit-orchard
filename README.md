# Orbit Orchard

A Three.js garden game for start.ng. Circle three paths on a floating island, collect all 18 glowing seeds within 75 seconds, and avoid wandering pests. You have three hearts and a short protective dash that recharges in 3.2 seconds.

This is an original circular exploration game, distinct from the platform's Lane Dash runner example.

## Play locally

Use Node.js 20 or newer:

```sh
npm run dev
```

Open **http://localhost:5173**. No dependency installation or build is needed. Three.js is pinned to version 0.160.0 through a jsDelivr import map; internet access is required. Google Fonts are optional and have system fallbacks. Open over HTTP, not directly as a file.

## Controls

| Action | Keyboard | Phone |
| --- | --- | --- |
| Circle left/right | Left/right arrows or A/D | Hold left/right buttons |
| Switch inner/outer ring | Up/down arrows or W/S | Tap up/down buttons |
| Dash through pests | Space | Dash button |
| Pause/resume | P or Escape | Pause / Keep growing |

The game pauses when the tab loses focus. A hit gives brief protection against repeated hits. Restart resets the entire harvest. Personal bests are stored in this browser separately for each start.ng user (and for guests); these are local records, not a shared leaderboard.

## start.ng identity and central styling

`src/platform.js` implements the public connection protocol demonstrated by https://lanedash.start.ng/src/platform.js:

1. On a `*.start.ng` host, load a hidden `https://start.ng/connect` frame.
2. Send `startng:whoami` with a unique request ID.
3. Accept `startng:user` only from the correct origin, iframe window, and request ID. The returned user provides `{ id, name, style }`.
4. Sign in at `https://start.ng/?return_to=...` and return to the game.
5. Recheck when the tab becomes visible or receives focus. Timeouts preserve an already known user; the game stays playable when the platform is unavailable.

The game never requests a user's password or handles a start.ng token. Untrusted names are rendered with `textContent`. If the account changes during a harvest, that run is discarded and the new account starts fresh.

`src/character.js` applies body, primary/secondary clothing colour, skin colour, hair colour, all seven demonstrated hairstyles, all five hat settings, and all six accessory settings. Change your appearance on start.ng and return to the game tab to refresh your character. Invalid colour values use defaults.

Localhost and other hosts provide guest play. Real account login and profile styling **must be verified on the deployed start.ng subdomain**; local tests do not prove live platform access.

## Checks

```sh
npm run check
npm test
```

The automated tests cover collection, ring movement, collision grace, dash protection and cooldown, win/loss, a complete harvest route, and account message validation.

An optional real Edge smoke check uses no npm dependencies:

```sh
npm run test:browser
```

It requires Microsoft Edge installed at its usual Windows location (or set `EDGE_PATH`), and available local ports 5187 and 9223. It starts its own local server and isolated headless profile, checks movement/collection, pause/resume, restart, and phone layout, and saves ignored screenshots under `.browser-check/`. It shuts down the browser and server after the check.

## Publish

Repository: https://github.com/HAFEEZAH029/orbit-orchard

1. Review and commit the finished changes, then push to `main`.
2. Sign in at start.ng and paste the public repository URL into **Your games**.
3. Follow any submission instructions and open the assigned start.ng address.
4. Verify that your name appears, the full harvest works, and keyboard and touch controls behave correctly.
5. Change clothing colour, hair, hat, and accessory centrally on start.ng. Return to the game and confirm the changes appear. Verify sign-out and a second account if available.

The project has `index.html` at its root, relative asset URLs, and no build step, following the example game's static layout. Confirm any platform-specific submission requirements in the dashboard. Pushing to GitHub alone does not publish on start.ng. No deployment or GitHub credentials belong in the source.

## Source

- `index.html`, `src/styles.css` — accessible menus, HUD, responsive styling, touch controls
- `src/main.js` — Three.js world, rendering, input, game lifecycle, local bests
- `src/game-state.js` — frame-independent gameplay rules
- `src/platform.js` — account bridge with timeouts and message validation
- `src/character.js` — profile-driven 3D character
- `scripts/serve.mjs` — local server using Node built-ins
- `tests/` — gameplay and platform security checks

Three.js is provided under its upstream MIT license: https://github.com/mrdoob/three.js/blob/r160/LICENSE
