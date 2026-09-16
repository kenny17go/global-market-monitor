import fs from 'node:fs/promises';

let app=await fs.readFile('app.js','utf8');
const before=app;

// $ = querySelector (one node); $$ = querySelectorAll converted to an array.
// Repair every accidental `$('<selector>').forEach(...)` without touching existing `$$()` calls.
app=app.replace(/(?<!\$)\$\(([^)\n]+)\)\.forEach\(/g,(_m,selector)=>`$$(${selector}).forEach(`);

// Avoid duplicate work accidentally introduced by repeated build patches.
app=app.replace(/function render\(\)\{if\(!DATA\)return;(?:renderConnectionSources\(\);)+/,"function render(){if(!DATA)return;renderConnectionSources();");

// Fail the build if any unsafe single-node selector.forEach remains.
const bad=app.match(/(?<!\$)\$\(([^)\n]+)\)\.forEach\(/);
if(bad) throw new Error('Unsafe querySelector.forEach remains: '+bad[0]);

await fs.writeFile('app.js',app);
console.log('Runtime regression guard applied; changed=',before!==app);
