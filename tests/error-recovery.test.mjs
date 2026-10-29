import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

class ApiRequestError extends Error {
  constructor(status, body) { super(body.detail ?? body.title ?? 'Request failed'); this.status = status; this.body = body }
}
class SessionRefreshUnavailable extends Error {}
function load(path, imports = {}) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  vm.runInNewContext(code, { exports, Error, require: name => imports[name] })
  return exports
}
const messages = load('../src/lib/apiMessagesVi.ts')
const errors = load('../src/lib/errors.ts', { '../api/client': { ApiRequestError }, '../api/sessionRefresh': { SessionRefreshUnavailable }, './apiMessagesVi': messages })

test('missing profile explains the exact place to finish setup', () => {
  const message = errors.getErrorMessage(new ApiRequestError(403, { detail: 'Vui lòng hoàn thiện hồ sơ trước khi dùng tính năng này.' }))
  assert.match(message, /Thông tin cơ bản/)
  assert.doesNotMatch(message, /onboarding|hệ thống/i)
})
test('a rejected landlord profile is not mistaken for missing account setup', () => {
  const detail = 'Hồ sơ chủ nhà chưa được duyệt. Vui lòng kiểm tra trạng thái xác minh.'
  assert.equal(errors.getErrorMessage(new ApiRequestError(403, { detail })), detail)
})
test('a missing resource gives task recovery, not an outage', () => {
  assert.equal(errors.getErrorMessage(new ApiRequestError(404, { detail: 'RentalPost was not found.' }), 'Tin này không còn. Hãy chọn tin khác.'), 'Tin này không còn. Hãy chọn tin khác.')
})
test('valid business amounts containing 500 are not hidden as server errors', () => {
  const detail = 'Số tiền tối thiểu là 500 đồng.'
  assert.equal(errors.getErrorMessage(new ApiRequestError(422, { detail })), detail)
})
test('rate limiting stays recoverable instead of an endless outage loader', () => {
  assert.equal(errors.isServiceDisruption(new ApiRequestError(429, {})), false)
  assert.equal(errors.getErrorMessage(new ApiRequestError(429, {})), errors.RATE_LIMIT_MESSAGE)
})
test('actual internal errors remain hidden and transient failures remain retryable', () => {
  const error = new ApiRequestError(500, { detail: 'System.InvalidOperationException: private database detail' })
  assert.equal(errors.getErrorMessage(error), errors.SYSTEM_ERROR_MESSAGE)
  assert.equal(errors.isServiceDisruption(error), true)
})

test('invalid login credentials are shown in clear Vietnamese', () => {
  for (const detail of ['Invalid login credentials', 'Invalid login credentials.']) {
    assert.equal(errors.getErrorMessage(new ApiRequestError(400, { detail })), 'Thông tin tài khoản hoặc mật khẩu không chính xác.')
    assert.equal(errors.getErrorMessage(new ApiRequestError(401, { detail })), 'Thông tin tài khoản hoặc mật khẩu không chính xác.')
    assert.equal(errors.getErrorMessage(new ApiRequestError(401, { title: detail })), 'Thông tin tài khoản hoặc mật khẩu không chính xác.')
    assert.equal(errors.getErrorMessage(new Error(detail)), 'Thông tin tài khoản hoặc mật khẩu không chính xác.')
  }
})

test('email confirmation and existing accounts give different recovery instructions', () => {
  assert.match(errors.getErrorMessage(new ApiRequestError(400, { detail: 'Email not confirmed' })), /chưa xác nhận email/)
  assert.match(errors.getErrorMessage(new ApiRequestError(400, { detail: 'User already registered' })), /Email này đã có tài khoản/)
  assert.equal(errors.getErrorMessage(new ApiRequestError(401, {})), 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
})
