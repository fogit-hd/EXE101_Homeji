import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

// Exercise the production API implementation while isolating transport/storage.
const source = await readFile(new URL('../src/api/index.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  transformers: { before: [context => root => ts.visitEachChild(root, node =>
    ts.isImportDeclaration(node) || (ts.isExportDeclaration(node) && node.moduleSpecifier)
      ? undefined : node, context)] },
}).outputText

test('bulk read commits local onboarding notifications only after server success', async () => {
  const bindings = `
    let fail = true;
    const calls = [];
    const apiRequest = async (path, options) => {
      calls.push([path, options.method]);
      if (fail) throw new Error('server rejected read');
    };
    let localWrites = 0;
    const markAllDefaultNotificationsRead = () => { localWrites++; };
    export const inspect = () => ({ localWrites, calls });
    export const recover = () => { fail = false; };
  `
  const api = await import(`data:text/javascript;base64,${Buffer.from(bindings + js).toString('base64')}`)
  await assert.rejects(api.markAllNotificationsRead(), /server rejected read/)
  assert.equal(api.inspect().localWrites, 0)
  api.recover()
  await api.markAllNotificationsRead()
  assert.equal(api.inspect().localWrites, 1)
  assert.deepEqual(api.inspect().calls, [['/api/notifications/read-all', 'POST'], ['/api/notifications/read-all', 'POST']])
})
