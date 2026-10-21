export function cleanAdminReportText(value: string | null | undefined) {
  const cleaned = value?.replace(/\s*\[[A-Z][A-Z0-9_:-]{4,}\]\s*$/u, '').trim()
  return cleaned || ''
}
