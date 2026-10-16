# Orbit Orchard

A Three.js game for start.ng: guide your character around a floating garden, collect glowing seeds, and avoid roaming hazards before time runs out.

## Current milestone: base project

Included: responsive introduction, animated Three.js garden preview, placeholder character, local development server, and GitHub-ready project structure.

**This milestone is a visual scaffold, not a playable game.** Movement, collision detection, scoring, mobile controls, and start.ng login/appearance integration are next, after the initial GitHub push.

## Run locally

Install Node.js 20 or newer, then run:

```sh
npm run dev
```

Open http://localhost:5173. No npm dependency installation or build is required. Internet access is required for Three.js from jsDelivr and optional Google Fonts. Serve the project over HTTP rather than opening index.html directly.

```sh
npm run check
```

This checks JavaScript syntax; it does not validate browser rendering or gameplay.

## GitHub setup

Create an **empty public repository** named `orbit-orchard` on GitHub. Do not add a README, license, or gitignore there; the project already contains its initial files. From this project directory, run:

```sh
git init
git add .
git commit -m "Set up Orbit Orchard Three.js base project"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/orbit-orchard.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username. After pushing, share the repository URL to continue development.

## Publishing to start.ng

The dashboard accepts a public GitHub repository URL under **Your games** and assigns a start.ng address. This project has an index.html at the repository root and uses relative asset URLs, following the public Lane Dash example's static structure. Platform submission/build requirements still need to be checked during deployment.

Publish for final acceptance after gameplay and platform integration are ready. A GitHub push alone does not publish the game on start.ng.

## Planned platform integration

The public reference at https://lanedash.start.ng/src/platform.js uses a hidden https://start.ng/connect iframe and origin-checked postMessage requests (`startng:whoami` / `startng:user`) to receive `{ id, name, style }`. It redirects to start.ng for sign-in and rechecks when the tab regains focus. This integration is **not implemented yet**.

The character will reflect profile settings such as primary/secondary colour, skin/hair colour, body, hairstyle, hat, and accessory. Verify real login and profile appearance on the deployed start.ng subdomain; local preview will use clearly labelled development data.

## Files

- `index.html` — page shell and Three.js import map
- `src/styles.css` — responsive visual design
- `src/main.js` — animated garden scaffold
- `scripts/serve.mjs` — local static server using Node built-ins
- `favicon.svg` — project icon

No credentials are required for the base project. Never commit account tokens or passwords.
