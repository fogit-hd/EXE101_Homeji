import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

// SSR tests load the real component, removing only its browser CSS import.
const require = createRequire(import.meta.url)
const source = (await readFile(new URL('../../src/components/ui/ChoicePicker.tsx', import.meta.url), 'utf8'))
  .replace("from 'react'", `from '${pathToFileURL(require.resolve('react')).href}'`)
  .replace("from 'react-dom'", `from '${pathToFileURL(require.resolve('react-dom')).href}'`)
  .replace("import './ChoicePicker.css'", '')
const javascript = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React,
} }).outputText
const reactImport = `import React from '${pathToFileURL(require.resolve('react')).href}';\n`
export const choicePickerModule = `data:text/javascript;base64,${Buffer.from(reactImport + javascript).toString('base64')}`
