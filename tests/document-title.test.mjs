import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/documentTitle.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
const { documentTitleFor } = await import(`data:text/javascript,${encodeURIComponent(outputText)}`)

test('each destination has its own title', () => {
  assert.equal(documentTitleFor('/login', ''), 'Đăng nhập · Homeji')
  assert.equal(documentTitleFor('/', '?section=marketplace&market=food'), 'Chợ Homeji · Homeji')
  assert.equal(documentTitleFor('/posts/abc/edit', ''), 'Sửa tin đăng · Homeji')
})

test('home and unknown destinations fall back to the product title', () => {
  assert.equal(documentTitleFor('/', ''), 'Homeji — Tìm phòng trọ quanh Thủ Đức và Quận 9')
  assert.equal(documentTitleFor('/', '?section=unknown'), 'Homeji — Tìm phòng trọ quanh Thủ Đức và Quận 9')
})

test('all unified auth sections have a precise title without exposing query text', () => {
  assert.equal(documentTitleFor('/auth', '?section=login'), 'Đăng nhập · Homeji')
  assert.equal(documentTitleFor('/auth', '?section=register'), 'Đăng ký · Homeji')
  assert.equal(documentTitleFor('/auth/', '?section=register'), 'Đăng ký · Homeji')
  assert.equal(documentTitleFor('/auth', '?section=forgot-password'), 'Quên mật khẩu · Homeji')
  assert.equal(documentTitleFor('/auth', '?section=constructor&email=private'), 'Đăng nhập · Homeji')
})
