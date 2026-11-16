// ava 8 loads test files with import(). On Node 22, importing a .ts file in a CommonJS package
// makes Node compile the file itself, so esbuild-register's require hook never sees it and the
// `import` statements fail. Returning format 'commonjs' without a source hands .ts files to the
// CommonJS loader, where esbuild-register compiles them. Node 24 does this without the hook.
import { register } from 'node:module'

const hooks = `
export async function load(url, context, nextLoad) {
  if (url.startsWith('file:') && url.endsWith('.ts')) {
    return { format: 'commonjs', source: null, shortCircuit: true }
  }
  return nextLoad(url, context)
}
`

register(`data:text/javascript,${encodeURIComponent(hooks)}`)
