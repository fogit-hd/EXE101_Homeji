import { useState } from 'react'

/** Detect changed inputs during render so derived state resets before children commit. */
export function useChangedInputs(inputs: readonly unknown[], initialize = false) {
  const [previous, setPrevious] = useState<readonly unknown[] | null>(() => initialize ? null : inputs)
  const changed = previous === null || inputs.length !== previous.length || inputs.some((value, index) => !Object.is(value, previous[index]))
  if (changed) setPrevious(inputs)
  return changed
}
