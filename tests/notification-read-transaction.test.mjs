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

test('bulk read reports server failure and succeeds only after retry', async () => {
  const bindings = `
    let fail = true;
    const calls = [];
    const apiRequest = async (path, options) => {
      calls.push([path, options.method]);
      if (fail) throw new Error('server rejected read');
    };
    export const inspect = () => ({ calls });
    export const recover = () => { fail = false; };
  `
  const api = await import(`data:text/javascript;base64,${Buffer.from(bindings + js).toString('base64')}`)
  await assert.rejects(api.markAllNotificationsRead(), /server rejected read/)
  api.recover()
  await api.markAllNotificationsRead()
  assert.deepEqual(api.inspect().calls, [['/api/notifications/read-all', 'POST'], ['/api/notifications/read-all', 'POST']])
})


test('notification inbox reflects only server events, including an empty inbox', async () => {
  const bindings = `let notifications=[]; const apiRequest=async()=>notifications;
    export const setNotifications=value=>{notifications=value};`;
  const api=await import(`data:text/javascript;base64,${Buffer.from(bindings+js).toString('base64')}`);
  assert.deepEqual(await api.getNotifications(),[]);
  const real={id:'server-event',title:'Lịch hẹn đã xác nhận',createdAt:'2026-10-23T00:00:00Z'};
  api.setNotifications([real]);assert.deepEqual(await api.getNotifications(),[real]);
})
