# Session renewal

Homeji keeps the existing bearer-token architecture. Newly signed-in email, Google, OTP and recovery sessions persist the refresh token alongside the access token in localStorage. No Supabase secret key is sent to the browser. Existing sessions without a saved refresh token need one new login.

Before protected JSON, upload or download requests, the client renews tokens within 60 seconds of expiry. The shared AuthProvider checks every 30 seconds and on focus/online. A rejected bearer token gets at most one refresh/retry; transport failures never replay business mutations. The browser coalesces concurrent renewal and uses a Web Lock across tabs, then rereads storage after acquiring the lock. Browsers without Web Locks rely on the provider rotation reuse window. Storage events synchronize profile/login state; late responses cannot restore a logged-out or replaced account.

POST /api/account/refresh takes the rotating refresh token and the original signed access token as the session anchor. The backend verifies anchor signature/issuer/audience while allowing expired lifetime, checks administrator revocation, exchanges the refresh with Supabase, then validates the new token signature, user and session_id. It rechecks revocation after exchange. Original anchor remains fixed across rotation so a new iat cannot bypass administrator revocation. Responses have Cache-Control: no-store; refresh credentials must not be logged.

Invalid refresh/signature/session or revocation returns 401 and clears the local session. Rate limiting, unavailable provider and connectivity errors preserve credentials for retry. Actual browser sessions still require reauthentication for provider revocation/security policy changes. This change does not extend JWT expiry or disable revocation.

Validation: backend signed ES256 anchor expiry, signature tampering, wrong-session exchange, revocation, invalid refresh and temporary provider errors; browser fixtures covering two-tab concurrency, expired reload, retained session during outage, retry, account replacement/logout races, protected JSON/upload/download; existing frontend session/API race tests. Fixture tests do not prove a real Supabase token rotation on a customer account.

Reference: https://supabase.com/docs/guides/auth/sessions
