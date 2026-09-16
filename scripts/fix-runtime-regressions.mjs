import fs from 'node:fs/promises';

let app=await fs.readFile('app.js','utf8');

// Runtime regression guard: $ = querySelector (single element), $$ = querySelectorAll (array).
app=app.replace("function switchView(name){$('.view').forEach(","function switchView(name){$$('.view').forEach(");

// Avoid duplicate work accidentally introduced by repeated build patches.
app=app.replace('function render(){if(!DATA)return;renderConnectionSources();renderConnectionSources();','function render(){if(!DATA)return;renderConnectionSources();');

await fs.writeFile('app.js',app);
console.log('Runtime regression guard applied');
