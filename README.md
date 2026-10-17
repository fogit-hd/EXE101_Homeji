# Homeji Web

Homeji is a platform that connects landlords and tenants. People can look for rooms, find roommates, and post listings on a map. This repository is the web front end (`exe-homeji-web`), built for the EXE101 course at FPT University. It is aimed mainly at students and workers around Thu Duc and District 9 in Ho Chi Minh City. The interface is in Vietnamese.

Live site: https://homeji.onrender.com

## Key features

- **Map-based search**: browse and filter rental listings on Google Maps, with place details, geocoding and directions.
- **Listings**: landlords create, edit and manage posts (`/posts/new`, `/posts/:postId/edit`).
- **Roommate matching and wanted posts**, saved listings, and a marketplace for second-hand items.
- **Chat and appointments** panels, and real-time notifications over SignalR.
- **Sign in** with email/password or Google; registration and password reset.
- **Payments / subscription plans** inside the app.
- **Admin area** (`/admin`) for moderating content.
- Light and dark mode.
- Optional AI-assisted features (natural-language search, draft helper, admin summary), each switched by an env flag.

## Tech stack

- React 19, TypeScript, Vite, React Router 7
- Google Maps JavaScript API and Places, `@react-oauth/google`
- `@microsoft/signalr` for real-time updates
- Motion and GSAP for animation, Three.js for visuals
- Plain CSS with CSS variables; ESLint for linting

## Project structure

```
src/
├── api/          # API client code
├── components/   # UI components
├── contexts/     # React contexts
├── hooks/
├── lib/          # helpers, labels, motion tokens
├── pages/
├── App.tsx       # routes
└── main.tsx
scripts/serve-prod.mjs   # production server (static files + /api proxy)
tests/                   # node:test contract tests
docs/  deploy/  public/
render.yaml              # Render web service blueprint
```

The mobile app (`exe-homeji-mobile`) is a separate project that shares the same back end; it is not in this repo.

## Getting started

Prerequisites: Node.js and npm, plus a Google Cloud project with a Maps API key and an OAuth client ID.

```bash
npm install
cp .env.example .env     # then fill in your own values
npm run dev
```

### Environment variables (names only)

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Back-end base URL. Leave empty to call `/api` on the same origin (the dev server and `serve-prod.mjs` proxy it). |
| `API_PROXY_TARGET` | Back-end URL used by `scripts/serve-prod.mjs` at runtime. |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps key. |
| `VITE_GOOGLE_MAP_ID` | Optional Cloud Map ID (vector map, advanced markers). |
| `VITE_GOOGLE_CLIENT_ID` | Google sign-in client ID. |
| `VITE_AI_NATURAL_SEARCH`, `VITE_AI_DECISION_TOOLS`, `VITE_AI_DRAFT_ASSISTANT`, `VITE_AI_ADMIN_SUMMARY`, `VITE_AI_SOURCE_BROWSER`, `VITE_AI_COMMUTE` | Feature flags (`true`/`false`). |

`.env.example` lists which Google APIs to enable for the Maps key (Maps JavaScript, Places, Geocoding, Routes, and optional ones).

### Scripts

`npm run dev`, `npm run build`, `npm start` (serve the built app), `npm run lint`, and test scripts such as `npm run test:contracts`.

## Usage

Guests see a landing page and a public map. After logging in, most features (marketplace, wanted posts, saved items, profile, payments, notifications, chat) open as panels over the home map instead of separate pages. Prices are shown in VND.

## Deployment

Deployed on Render as a Node web service (`render.yaml`): build with `npm install && npm run build`, start with `npm start`. The server serves the built app and proxies `/api` to the Homeji back end, so the browser does not need CORS.

## Team

Homeji team, EXE101, FPT University. Repository owner: [@fogit-hd](https://github.com/fogit-hd).

## License

No license file is included.
