import assert from 'node:assert/strict'
import test from 'node:test'
import {paymentReturnHint,paymentResultState,paymentReturnUrl} from '../src/lib/paymentReturn.ts'
test('redirect keeps only identifiers and gateway outcome hints',()=>{
 const url=paymentReturnUrl(new URLSearchParams('section=payments&orderId=803347&provider=payos&cancel=true&providerStatus=CANCELLED&signature=secret&message=untrusted&access_token=secret'))
 const params=new URL(url,'https://homeji.test').searchParams
 assert.equal(params.get('cancel'),'true');assert.equal(params.get('providerStatus'),'CANCELLED');assert.equal(params.get('orderId'),'803347')
 for(const key of ['signature','message','access_token','section'])assert.equal(params.has(key),false)
})
test('payOS return and cancel URLs and MoMo codes map to presentation hints',()=>{
 for(const query of ['cancel=true','providerStatus=CANCELLED','status=CANCELLED&code=00'])assert.equal(paymentReturnHint(new URLSearchParams(query),2),'cancelled')
 for(const code of ['1006','1003','1017'])assert.equal(paymentReturnHint(new URLSearchParams('resultCode='+code),1),'cancelled')
 for(const code of ['0','7000','7002','9000'])assert.equal(paymentReturnHint(new URLSearchParams('resultCode='+code),1),'verifying')
 assert.equal(paymentReturnHint(new URLSearchParams('resultCode=1005'),1),'expired')
 assert.equal(paymentReturnHint(new URLSearchParams('resultCode=1001'),1),'failed')
 assert.equal(paymentReturnHint(new URLSearchParams('status=PAID'),2),'verifying')
 assert.equal(paymentReturnHint(new URLSearchParams('provider=momo&resultCode=1006'),2),'none')
})
test('server terminal state wins; URL success never credits pending payments',()=>{
 for(const hint of ['none','cancelled','failed','expired','verifying'])assert.equal(paymentResultState(2,hint,false),'success')
 assert.equal(paymentResultState(1,'verifying',false),'verifying')
 assert.equal(paymentResultState(1,'cancelled',false),'cancel-return')
 assert.equal(paymentResultState(1,'none',true),'overdue')
 assert.equal(paymentResultState(1,'none',false),'pending')
 assert.equal(paymentResultState(3,'verifying',false),'failed')
 assert.equal(paymentResultState(4,'verifying',false),'cancelled')
 assert.equal(paymentResultState(5,'verifying',false),'expired')
})
