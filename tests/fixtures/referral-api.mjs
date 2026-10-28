// Local UI fixture: never contacts production or issues real rewards.
import { readFile } from 'node:fs/promises'
let source = await readFile(new URL('./ai-browser-api.mjs', import.meta.url), 'utf8')
source = source.replace("const audit = []", `const audit = []; const referral = { code: 'ABCDEF012345ABCDEF012345', successfulInvites: 0, remainingPairs: 10, received: false, vouchers: [] };`)
const anchor = "if (path === '/__qa/audit') body = audit"
source = source.replace(anchor, `if (path === '/api/search-interests') body = { settings: { enabled: false }, suggestions: [], following: [], rooms: [] };
else if (path === '/api/chatbot/popup-config') body = {enabled:false};
else if (path === '/api/referrals/claim') {
 referral.received = true; referral.remainingPairs = 9;
 referral.vouchers = ['food','food','food','vip'].map((purpose,index)=>({id:'voucher-'+index,purpose,rate:purpose==='food'?.05:.2,maximumDiscount:purpose==='food'?10000:20000,minimumSpend:purpose==='food'?100000:50000,expiresAt:new Date(Date.now()+30*86400000).toISOString(),used:false})); body=referral;
} else if (path === '/api/referrals' || path === '/api/referrals/code') body = referral;
else if (path === '/api/referrals/quote') body = { discount: Math.min(input.purpose==='food'?10000:20000,Math.floor(input.amount*(input.purpose==='food'?.05:.2))) };
else if (path === '/__qa/audit') body = audit`)
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))
