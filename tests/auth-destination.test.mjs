import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const compile = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText).toString('base64')}`
const typesUrl = compile(await readFile(new URL('../src/api/types.ts', import.meta.url), 'utf8'))
const { UserRole } = await import(typesUrl)
const { authDestination, persistAuthDestination, consumeAuthDestination } = await import(compile((await readFile(new URL('../src/lib/authDestination.ts', import.meta.url), 'utf8'))
  .replace('../api/types', typesUrl)))

test('admin lands in management by default; other and unknown profiles land at home', () => {
  assert.equal(authDestination(undefined, UserRole.Admin), '/admin')
  for (const role of [UserRole.Renter, UserRole.Landlord, undefined]) {
    assert.equal(authDestination(undefined, role), '/')
  }
})

test('email-link return path is validated, consumed once, and tolerates blocked storage', () => {
  const values = new Map()
  globalThis.sessionStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  }
  persistAuthDestination('/?section=messages&conversation=123#latest')
  assert.equal(consumeAuthDestination(undefined), '/?section=messages&conversation=123#latest')
  assert.equal(consumeAuthDestination(undefined), '/')
  for (const path of ['//evil.test', '/\\evil.test', '/\nevil.test', 'https://evil.test']) {
    persistAuthDestination('/?section=saved')
    persistAuthDestination(path)
    assert.equal(consumeAuthDestination(UserRole.Admin), '/admin')
    values.set('homeji:auth-return-path', path)
    assert.equal(consumeAuthDestination(undefined), '/')
  }
  globalThis.sessionStorage = {
    getItem() { throw new Error('blocked') },
    setItem() { throw new Error('blocked') },
    removeItem() { throw new Error('blocked') },
  }
  assert.doesNotThrow(() => persistAuthDestination('/'))
  assert.equal(consumeAuthDestination(undefined), '/')
  delete globalThis.sessionStorage
})

test('explicit internal destination survives login for every role', () => {
  for (const role of [UserRole.Admin, UserRole.Renter, undefined]) {
    for (const path of ['/', '/?section=saved', '/admin', '/posts/123/edit', '/?section=listings&keyword=UEL']) {
      assert.equal(authDestination(path, role), path)
    }
  }
})

test('untrusted destinations cannot redirect outside Homeji', () => {
  for (const from of [null, 1, '', 'https://evil.test', '//evil.test', '/\\evil.test', '/\nevil.test', '/\tevil.test']) {
    assert.equal(authDestination(from, UserRole.Admin), '/admin')
    assert.equal(authDestination(from, UserRole.Renter), '/')
  }
})
