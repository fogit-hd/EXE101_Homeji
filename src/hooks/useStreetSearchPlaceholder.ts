import { useEffect, useState } from 'react'

export const STREET_SEARCH_EXAMPLES = [
  'Tìm phòng gần Lê Văn Việt',
  'Căn hộ gần Đỗ Xuân Hợp',
  'Tìm trọ gần Võ Văn Ngân',
  'Phòng thuê gần Nguyễn Duy Trinh',
  'Tìm phòng gần Man Thiện',
  'Căn hộ gần Lã Xuân Oai',
] as const

/** Animate hints only; the user's query and accessible label remain unchanged. */
export function useStreetSearchPlaceholder(enabled: boolean, fallback: string) {
  const [text, setText] = useState('')
  useEffect(() => {
    if (!enabled) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let timer: ReturnType<typeof setTimeout> | undefined
    let phraseIndex = 0, characterIndex = 0, deleting = false
    let disposed = false
    const tick = () => {
      if (disposed || document.hidden || motion.matches) return
      const phrase = STREET_SEARCH_EXAMPLES[phraseIndex]
      characterIndex += deleting ? -1 : 1
      setText(phrase.slice(0, characterIndex))
      if (characterIndex === phrase.length) deleting = true
      else if (characterIndex === 0) { deleting = false; phraseIndex = (phraseIndex + 1) % STREET_SEARCH_EXAMPLES.length }
      timer = setTimeout(tick, characterIndex === phrase.length ? 1700 : characterIndex === 0 ? 300 : deleting ? 28 : 65)
    }
    const restart = () => {
      clearTimeout(timer)
      phraseIndex = 0; characterIndex = 0; deleting = false
      setText(motion.matches ? STREET_SEARCH_EXAMPLES[0] : '')
      if (!document.hidden && !motion.matches) timer = setTimeout(tick, 350)
    }
    restart()
    document.addEventListener('visibilitychange', restart)
    motion.addEventListener('change', restart)
    return () => { disposed = true; clearTimeout(timer); document.removeEventListener('visibilitychange', restart); motion.removeEventListener('change', restart) }
  }, [enabled])
  return enabled ? text || fallback : fallback
}
