import assert from 'node:assert/strict'
import test from 'node:test'
import { validateRegistrationPassword } from '../src/lib/userInputValidation.ts'

test('registration requires password confirmation', () => {
  assert.equal(validateRegistrationPassword('secret123', ''), 'Vui lòng nhập lại mật khẩu.')
})

test('registration rejects mismatched passwords including whitespace and case', () => {
  for (const confirmation of ['secret124', 'Secret123', ' secret123', 'secret123 ']) {
    assert.equal(validateRegistrationPassword('secret123', confirmation), 'Mật khẩu xác nhận chưa khớp.')
  }
})

test('registration preserves the existing minimum password length', () => {
  assert.equal(validateRegistrationPassword('12345', '12345'), 'Mật khẩu cần từ 6 ký tự trở lên.')
  assert.equal(validateRegistrationPassword('123456', '123456'), null)
})

test('matching passwords are accepted without normalizing their contents', () => {
  assert.equal(validateRegistrationPassword(' secret123 ', ' secret123 '), null)
})
