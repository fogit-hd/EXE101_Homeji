import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const compile = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText).toString('base64')}`
const typesUrl = compile(await readFile(new URL('../src/api/types.ts', import.meta.url), 'utf8'))
const { UserRole } = await import(typesUrl)
const { authDestination } = await import(compile((await readFile(new URL('../src/lib/authDestination.ts', import.meta.url), 'utf8'))
  .replace('../api/types', typesUrl)))

test('admin lands in management by default; other and unknown profiles land at home', () => {
  assert.equal(authDestination(undefined, UserRole.Admin), '/admin')
  for (const role of [UserRole.Renter, UserRole.Landlord, undefined]) {
    assert.equal(authDestination(undefined, role), '/')
  }
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
