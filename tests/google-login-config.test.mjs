import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const apiSource = readFileSync(new URL('../src/api/index.ts', import.meta.url), 'utf8')
const renderBlueprint = readFileSync(new URL('../render.yaml', import.meta.url), 'utf8')

test('Google Identity Services receives an environment value with a production fallback', () => {
  assert.match(appSource, /import\.meta\.env\.VITE_GOOGLE_CLIENT_ID\?\.trim\(\)/)
  assert.match(appSource, /GoogleOAuthProvider clientId=\{googleClientId\}/)
  assert.match(
    appSource,
    /675096303664-kv4mvsd8rqldf2dicodtb7to8gpk1ipp\.apps\.googleusercontent\.com/,
  )
})

test('Google ID tokens are exchanged through the backend', () => {
  assert.match(apiSource, /['"]\/api\/account\/google\/id-token['"]/)
})

test('Render builds the frontend with the configured Google OAuth client id', () => {
  assert.match(renderBlueprint, /plan:\s*free/)
  assert.doesNotMatch(renderBlueprint, /key:\s*VITE_API_BASE_URL/)
  assert.match(renderBlueprint, /key:\s*VITE_GOOGLE_CLIENT_ID/)
  assert.match(
    renderBlueprint,
    /675096303664-kv4mvsd8rqldf2dicodtb7to8gpk1ipp\.apps\.googleusercontent\.com/,
  )
})
