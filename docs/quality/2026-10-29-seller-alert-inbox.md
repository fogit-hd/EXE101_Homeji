# Seller order inbox and automatic sound

## Experience

- Compact inbox with a teal header, status filters and concise order cards replaces the repeated summary and expanded settings block.
- Empty, loading and failed-sync states are distinct. A read failure retains the last known queue.
- Sound and refresh controls stay visible; notification settings start collapsed, including when there are no orders.
- Opening an order and stopping its sound remain separate actions. Stopping sound does not accept, deliver or remove an order.

## Sound behavior

- Sound is enabled by default when no preference exists. Explicit mute remains respected across reloads and tabs.
- Arming is attempted as soon as a seller queue is available and retried on trusted click/keyboard interactions, focus and visibility recovery.
- Automatic arming is silent for an empty queue. The test button is the only action that plays a preview.
- The UI reports ready only after AudioContext is running. Browser autoplay policies can still require the first user interaction.
- Delayed resume cannot override mute/disposal; obsolete component activation attempts cannot overwrite a newer result.
- Existing per-order-version acknowledgements, one-minute reminders, duplicate suppression and cross-tab locking remain in use.

## Validation

- TypeScript/Vite build and targeted ESLint passed.
- 412 unit/regression tests passed, including four audio lifecycle tests.
- Seller fixture E2E passed automatic arming, silent empty queue, persistent mute, explicit preview, status filters, cart grouping, duplicate events, acknowledgement/reload, stage changes, synchronization failure retention, offline polling recovery and reminders.
- A second browser tab verifies shared enable/mute preferences. A positive storage event preserves a valid pending resume in the receiving tab.
- Fixture screenshots cover light/dark and 320, 390, 1440 px. No production order or payment was created. Oscillator scheduling does not establish physical speaker output on every device.

## Browser reference

https://developer.chrome.com/blog/autoplay/
