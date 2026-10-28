import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'
const require=createRequire(import.meta.url)

// DOM component tests execute the actual TypeScript. CSS is checked separately;
// only external animation failures are substituted when a test asks for that seam.
export function reactDomModule(file, overrides={}) {
  const source=fs.readFileSync(file,'utf8').replace(/^import\s+['"][^'"]+\.css['"];?\s*$/gm,'')
  let code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText
  const resolveModule=specifier=>{
    let url=overrides[specifier]
    if(!url && specifier.startsWith('.')) {
      const base=path.resolve(path.dirname(file),specifier)
      const dependency=[base,base+'.ts',base+'.tsx'].find(name=>fs.existsSync(name)&&fs.statSync(name).isFile())
      if(!dependency)throw new Error('Missing test module '+specifier)
      url=reactDomModule(dependency,overrides)
    }
    url??=pathToFileURL(require.resolve(specifier)).href
    return url
  }
  code=code.replace(/from\s+(['"])([^'"]+)\1/g,(_,quote,specifier)=>'from '+quote+resolveModule(specifier)+quote)
  code=code.replace(/import\((['"])([^'"]+)\1\)/g,(_,quote,specifier)=>'import('+quote+resolveModule(specifier)+quote+')')
  return 'data:text/javascript;base64,'+Buffer.from(`import React from '${pathToFileURL(require.resolve('react')).href}';\n`+code).toString('base64')
}
