# Browser session lives in HttpOnly cookies on the frontend origin

Status: accepted, 2026-11-04.

## Context

Access and refresh tokens were kept in `localStorage`, where any script running in the page can read and carry them away. The production frontend reaches the API through the same-origin proxy in `scripts/serve-prod.mjs`. `onrender.com` is on the Public Suffix List, so `homeji.onrender.com` and `homeji-be.onrender.com` are different sites, and a cookie set directly by the API host would be third-party.

## Decision

The API issues the session as host-only cookies that travel through the proxy: `HttpOnly; Secure; SameSite=Strict; Path=/api/account/session`. They hold the refresh token, the signed anchor token that administrator revocation compares against, and the current access token. Page JavaScript holds only the access token, in memory, and gets it from `POST /api/account/session`. A readable `homeji_session_hint` cookie, which holds no secret, lets guests skip that call.

Those endpoints also require the `X-Homeji-Session: cookie` header and an `Origin` listed in `AuthCookies:AllowedOrigins`, which is kept apart from the CORS list because that one includes local development hosts.

## Consequences

- This limits what XSS can steal; it does not prevent XSS. An injected script can still call the API and obtain a short-lived access token while the page is open. It can no longer take the refresh token away. A Content Security Policy remains the control that reduces XSS itself.
- Cookie sessions need a same-origin deployment. Setting `VITE_API_BASE_URL` to another site breaks sign-in persistence.
- Reloading a page does not call Supabase while the access token in the cookie has more than two minutes left.
- Signing out needs the API, because JavaScript cannot delete HttpOnly cookies. A sign-out that cannot reach it is remembered in `localStorage` and retried, and the session is treated as ended meanwhile.
- Sessions saved in `localStorage` by earlier versions are moved over by `POST /api/account/session/adopt`, which does not call Supabase. The login endpoints keep returning tokens in the body to clients without the mode header until open tabs of older bundles are gone; that path and `POST /api/account/refresh` are then to be removed.
- Rolling back to a bundle that only reads `localStorage` signs out users who have already moved.
