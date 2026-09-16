import fs from 'node:fs/promises';

let app=await fs.readFile('app.js','utf8');
const before=app;

// $ = querySelector (one node); $$ = querySelectorAll converted to an array.
// Any `.forEach` on these selector groups must use $$.
app=app.replace(/function switchView\(name\)\{\$+\('\.view'\)\.forEach/g,"function switchView(name){$$('.view').forEach");
app=app.replace(/\$+\('\[data-view\]'\)\.forEach/g,"$$('[data-view]').forEach");

// Avoid duplicate work accidentally introduced by repeated build patches.
app=app.replace(/function render\(\)\{if\(!DATA\)return;(?:renderConnectionSources\(\);)+/,"function render(){if(!DATA)return;renderConnectionSources();");

// Fail the build if a single-node selector is still used with forEach.
if(/\$\([^\n;]+\)\.forEach\(/.test(app)){
  const bad=app.match(/\$\([^\n;]+\)\.forEach\(/)?.[0]||'unknown';
  throw new Error('Unsafe querySelector.forEach remains: '+bad);
}

await fs.writeFile('app.js',app);
console.log('Runtime regression guard applied; changed=',before!==app);
