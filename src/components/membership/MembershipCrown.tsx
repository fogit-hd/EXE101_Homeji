import { useId } from 'react';

export function MembershipCrown() {
  const id = useId();
  return <svg viewBox="0 0 32 32" width="16" height="16" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={id+'gold'} x1="8" y1="5" x2="23" y2="26" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fff2b1"/><stop offset=".3" stopColor="#ffd66c"/><stop offset=".65" stopColor="#d69922"/><stop offset="1" stopColor="#a5620d"/>
      </linearGradient>
      <linearGradient id={id+'base'} x1="7" y1="24" x2="25" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#c68a20"/><stop offset=".42" stopColor="#ffe699"/><stop offset=".7" stopColor="#dfa534"/><stop offset="1" stopColor="#a86412"/>
      </linearGradient>
    </defs>
    <path d="m2.8 8.3 8 5.4L16 3.4l5.2 10.3 8-5.4-3.6 14.2H6.4L2.8 8.3Z" fill={'url(#'+id+'gold)'} stroke="#94550b" strokeWidth="1.25" strokeLinejoin="round"/>
    <path d="m16 5.7-4.1 9.8L16 21V5.7Z" fill="#fff2ae"/>
    <path d="m16 5.7 4.1 9.8L16 21V5.7Z" fill="#b67210" opacity=".46"/>
    <path d="m4.6 10.5 6.8 5L8.6 21H7.5L4.6 10.5Z" fill="#ffe9a1"/>
    <path d="m27.4 10.5-6.8 5 2.8 5h1.1l2.9-10.5Z" fill="#99560a" opacity=".45"/>
    <path d="m4 9.7 7.1 5L16 5.4l4.9 9.3 7.1-5" stroke="#fff4c0" strokeWidth=".8" strokeLinejoin="round" opacity=".9"/>
    <path d="M6.5 24h19v4h-19z" fill={'url(#'+id+'base)'} stroke="#94550b" strokeWidth="1.1" strokeLinejoin="round"/>
    <path d="M7.5 24.9h17" stroke="#fff0b0" strokeWidth=".85"/>
    <path d="m16 16.5 2.6 3-2.6 3-2.6-3 2.6-3Z" fill="#8d4b08" stroke="#ffdf85" strokeWidth=".65"/>
    <path d="m16 17.4-1.7 2.1 1.7-.65 1.7.65-1.7-2.1Z" fill="#fff0a7"/>
    <path d="m16 18.85 1.7.65-1.7 2.1v-2.75Z" fill="#d58d19"/>
  </svg>;
}
