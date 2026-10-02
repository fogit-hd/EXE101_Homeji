import type { NavIconName } from './navigation'

type Props = { name: NavIconName }

export function ShellIcon({ name }: Props) {
  const common = {
    viewBox: '0 0 24 24',
    width: 20,
    height: 20,
    'aria-hidden': true as const,
  }
  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path fill="currentColor" d="M12 3.2 4 10v10h6v-6h4v6h6V10l-8-6.8zm0 2.3 6 5.1V18h-2v-6H8v6H6v-7.4l6-5.1z" />
        </svg>
      )
    case 'search':
      return (
        <svg {...common}>
          <path fill="currentColor" d="M15.5 14h-.8l-.3-.3a6.5 6.5 0 1 0-.7.7l.3.3v.8l5 5 1.5-1.5-5-5zM10 14.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z" />
        </svg>
      )
    case 'map':
      return (
        <svg {...common}>
          <path fill="currentColor" d="M20.5 3.2 15 5.1 9 3 3.4 4.9A.5.5 0 0 0 3 5.4v15.1l.2.1L9 18.9l6 2.1 5.6-1.9a.5.5 0 0 0 .4-.5V3.5a.5.5 0 0 0-.5-.3zM15 19l-6-2.1V5l6 2.1V19z" />
        </svg>
      )
    case 'bookmark':
      return (
        <svg {...common}>
          <path fill="currentColor" d="M17 3H7a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2zm0 15-5-2.2L7 18V5h10v13z" />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...common}>
          <path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V9h14v11z" />
        </svg>
      )
    case 'users':
      return (
        <svg {...common}>
          <path fill="currentColor" d="M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3zM8 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5C15 14.2 10.3 13 8 13zm8 0c-.3 0-.6 0-1 .1 1.2.8 2 2 2 3.4V19h6v-2.5c0-2.3-4.7-3.5-7-3.5z" />
        </svg>
      )
    case 'chat':
      return (
        <svg {...common}>
          <path fill="currentColor" d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm0 14H5.2L4 17.2V4h16v12z" />
        </svg>
      )
    case 'utensils':
      return (
        <svg {...common}>
          <path fill="currentColor" d="M8 2v8.2A3.2 3.2 0 0 1 6.2 13H6v9H4v-9h-.2A3.2 3.2 0 0 1 2 10.2V2h2v7h1V2h2v7h1V2h2zm8 0c2.2 2.4 3 4.6 3 7.2 0 2.4-1.2 3.8-3 3.8V22h-2V2h2z" />
        </svg>
      )
    case 'bag':
      return (
        <svg {...common}>
          <path fill="currentColor" d="M7 18a2 2 0 1 0 2 2 2 2 0 0 0-2-2zm10 0a2 2 0 1 0 2 2 2 2 0 0 0-2-2zM7.2 14h9.9a2 2 0 0 0 1.7-1L22 7H6.2L5.3 4H2v2h2l3.6 7.6-.9 1.6A1.5 1.5 0 0 0 8 18h12v-2H8.4l.8-2z" />
        </svg>
      )
    case 'list':
      return (
        <svg {...common}>
          <path fill="currentColor" d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2z" />
        </svg>
      )
    case 'plus':
      return (
        <svg {...common}>
          <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
      )
    case 'receipt':
      return (
        <svg {...common}>
          <path fill="currentColor" d="M6 2h12a2 2 0 0 1 2 2v18l-3-1.5L14 22l-3-1.5L8 22l-3-1.5L2 22V4a2 2 0 0 1 2-2h2zm0 2v14.2l1 .5 3 1.5 3-1.5 3 1.5 1-.5V4H6zm2 3h8v2H8V7zm0 4h8v2H8v-2z" />
        </svg>
      )
    case 'wallet':
      return (
        <svg {...common}>
          <path fill="currentColor" d="M20 7H5a1 1 0 0 1 0-2h13V3H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h15a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zm0 12H5a1 1 0 0 1-1-1V8.8A3 3 0 0 0 5 9h15v10zm-3-5.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
        </svg>
      )
    case 'card':
      return (
        <svg {...common}>
          <path fill="currentColor" d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
        </svg>
      )
    case 'user':
      return (
        <svg {...common}>
          <path fill="currentColor" d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4z" />
        </svg>
      )
    case 'bell':
      return (
        <svg {...common}>
          <path fill="currentColor" d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6v-5a6 6 0 0 0-5-5.9V4a1 1 0 0 0-2 0v1.1A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2z" />
        </svg>
      )
    case 'megaphone':
      return (
        <svg {...common}>
          <path fill="currentColor" d="M3 10v4a2 2 0 0 0 2 2h2l4 4V4L7 8H5a2 2 0 0 0-2 2zm16-1-3 1.2v3.6L19 15a3 3 0 0 0 0-6z" />
        </svg>
      )
    case 'activity':
      return (
        <svg {...common}>
          <path fill="currentColor" d="M4 13h3v8H4v-8zm5-6h3v14H9V7zm5 4h3v10h-3V11zm5-6h3v16h-3V5z" />
        </svg>
      )
    case 'shield':
      return (
        <svg {...common}>
          <path fill="currentColor" d="M12 2 4 5v6c0 5.2 3.4 10 8 11 4.6-1 8-5.8 8-11V5l-8-3zm0 10h6.2A9 9 0 0 1 12 19.8V12H6V6.4l6-2.2V12z" />
        </svg>
      )
    default:
      return null
  }
}
