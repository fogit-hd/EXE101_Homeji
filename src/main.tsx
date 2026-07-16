import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/**
 * Some third-party gesture handlers may call preventDefault() on non-cancelable
 * touch events while scrolling, which spams Chromium intervention warnings.
 * Guard preventDefault globally: non-cancelable events cannot be prevented anyway.
 */
const __homejiWindow = window as Window & { __homejiPreventDefaultPatched?: boolean }
if (!__homejiWindow.__homejiPreventDefaultPatched) {
  const nativePreventDefault = Event.prototype.preventDefault
  Event.prototype.preventDefault = function patchedPreventDefault(this: Event): void {
    if (!this.cancelable) return
    nativePreventDefault.call(this)
  }
  __homejiWindow.__homejiPreventDefaultPatched = true
}

/**
 * Do NOT wrap the app in React.StrictMode while Google Maps Vector/WebGL is in use.
 * Strict Mode double-invokes effects in DEV: create map → destroy → create again.
 * That exhausts WebGL contexts and Google falls back to Raster ("Attempted to load a
 * Vector Map, but failed"), which is why maps.google.com stays smooth but this app lags.
 */
createRoot(document.getElementById('root')!).render(<App />)
