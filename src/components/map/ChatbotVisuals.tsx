export type AssistantIconName = 'expand' | 'shrink' | 'plus' | 'tools' | 'close' | 'send' | 'copy' | 'search' | 'home' | 'bag' | 'bookmark' | 'chat' | 'calendar' | 'arrow'

export function AssistantIcon({ name }: { name: AssistantIconName }) {
  const paths: Record<AssistantIconName, string> = {
    expand: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M3 3l6 6m12-6-6 6M3 21l6-6m12 6-6-6',
    shrink: 'M3 8h5V3m8 0v5h5M8 21v-5H3m18 0h-5v5M8 8 3 3m13 5 5-5M8 16l-5 5m13-5 5 5',
    plus: 'M12 5v14M5 12h14',
    tools: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    close: 'm6 6 12 12M6 18 18 6',
    send: 'M12 19V5m-6 6 6-6 6 6',
    copy: 'M9 9h12v12H9zM15 9V3H3v12h6',
    search: 'M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    home: 'm3 10 9-7 9 7v11H3zm6 11v-7h6v7',
    bag: 'M4 7h16l1 14H3zm4 0V5a4 4 0 0 1 8 0v2',
    bookmark: 'M6 3h12v18l-6-4-6 4z',
    chat: 'M21 11a9 9 0 0 1-9 9H3l1-5a9 9 0 1 1 17-4',
    calendar: 'M3 5h18v16H3zM7 3v4m10-4v4M3 10h18M7 14h3m4 0h3',
    arrow: 'M5 12h14m-5-5 5 5-5 5',
  }

  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}

export function HomejiAvatar({ inline = false }: { inline?: boolean }) {
  return (
    <span className={`map-chatbot__avatar${inline ? ' map-chatbot__avatar--inline' : ''}`} aria-hidden>
      <img src="/brand/homeji-logo2.png" alt="" draggable={false} />
    </span>
  )
}
