/** Public references are derived from stored identities; they never replace database IDs. */
export function listingReference(id: string, source?: string, sourceId?: string): string | null {
  const prefixes: Record<string, string> = { mogi: 'MG', phongtro123: 'PT123', phongtrovn: 'PTVN', muaban: 'MB' }
  if (source && prefixes[source] && sourceId && /^\d{1,80}$/.test(sourceId) && !/^0+$/.test(sourceId)) return `${prefixes[source]}-${sourceId}`
  const hex = id.replace(/-/g, '')
  if (!/^[a-f0-9]{32}$/i.test(hex) || /^0+$/.test(hex)) return null
  return `HJ-${BigInt(`0x${hex}`).toString(36).toUpperCase()}`
}
