// Loopback-only display fixtures. No production credentials, writes or payments.
import { readFile } from 'node:fs/promises'
let source = await readFile(new URL('./ai-browser-api.mjs', import.meta.url), 'utf8')
source = source.replace("onboardingCompleted: true, isPremium: false", "onboardingCompleted: false, phone: '0901234567', school: 'Đại học Kinh tế - Luật', contactAddress: 'Linh Trung, Thủ Đức', isPremium: false")
source = source.replace("if (path === '/__qa/audit') body = audit", "if (path === '/api/search-interests') body = { settings: { enabled: false }, suggestions: [], following: [], rooms: [] }; else if (path === '/__qa/audit') body = audit")
await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))
