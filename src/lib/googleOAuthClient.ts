// Keep the previously configured public production identifier, with env override.
const productionGoogleOAuthClientId =
  '675096303664-kv4mvsd8rqldf2dicodtb7to8gpk1ipp.apps.googleusercontent.com'
export const googleOAuthClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || productionGoogleOAuthClientId
