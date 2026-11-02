export function ContactBrandIcon({ brand }: { brand: 'facebook' | 'zalo' }) {
  return brand === 'facebook'
    ? <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="#1877f2" /><path fill="#fff" d="M18.5 29V18h3.7l.6-4.3h-4.3V11c0-1.2.4-2.1 2.2-2.1H23V5.1c-.4-.1-1.8-.2-3.4-.2-3.4 0-5.7 2.1-5.7 5.9v2.9H10V18h3.9v11z" /></svg>
    : <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden="true"><rect width="40" height="40" rx="12" fill="#0068ff" /><path d="M7 8h26v16c0 5-4 8-10 8h-7l-6 3 1-6c-3-2-4-5-4-9z" fill="#fff" /><text x="20" y="23" textAnchor="middle" fill="#0068ff" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="12">Zalo</text></svg>
}
