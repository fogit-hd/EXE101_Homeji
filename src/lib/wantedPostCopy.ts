/** Omit the API's demo disclaimer from member-facing descriptions. */
export function memberWantedDescription(value?: string | null): string {
  return (value ?? '').replace(/Nhu cầu minh họa; không phải yêu cầu thuê thực tế\.?/g, '').trim()
}
