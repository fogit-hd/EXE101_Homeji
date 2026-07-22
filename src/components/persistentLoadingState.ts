/** Resolves whether data-backed content should still display its loading surface. */
export function shouldShowPersistentLoader(
  loading: boolean,
  disrupted: boolean,
  introHolding: boolean,
  holdForIntro = false,
): boolean {
  return holdForIntro ? introHolding : loading || disrupted
}
