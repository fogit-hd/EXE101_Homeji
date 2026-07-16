/**
 * Prevent Chromium intervention spam:
 * "Ignored attempt to cancel a touchstart/touchmove event with cancelable=false..."
 *
 * Some third-party handlers call preventDefault() while scrolling. When the event is
 * non-cancelable, that call is ineffective and only emits noisy warnings.
 *
 * This module must load before App/third-party libs so any cached references also
 * point to this guarded implementation.
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

