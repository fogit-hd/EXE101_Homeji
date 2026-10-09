/** Build-time rollout controls. Backend auth and constraints remain authoritative. */
export const aiFeatureFlags = {
  naturalSearch: import.meta.env.VITE_AI_NATURAL_SEARCH !== 'false',
  decisionTools: import.meta.env.VITE_AI_DECISION_TOOLS !== 'false',
  draftAssistant: import.meta.env.VITE_AI_DRAFT_ASSISTANT !== 'false',
  adminSummary: import.meta.env.VITE_AI_ADMIN_SUMMARY !== 'false',
  sourceBrowser: import.meta.env.VITE_AI_SOURCE_BROWSER !== 'false',
  // Enable after live Routes coverage, quota and partial-failure verification.
  commute: import.meta.env.VITE_AI_COMMUTE === 'true',
}
