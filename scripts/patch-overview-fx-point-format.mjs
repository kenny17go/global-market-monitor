import fs from 'node:fs/promises';

let app=await fs.readFile('app.js','utf8');
const helper="const fxPoint2=v=>{const x=Number(v);return Number.isFinite(x)?x.toFixed(2):'—'};\n";
if(!app.includes('const fxPoint2=')){
  app=app.replace("const fmt=(v,d=2)=>Number(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});\n", "const fmt=(v,d=2)=>Number(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});\n"+helper);
}
const before="<td>${x.p1m}</td><td>${x.p3m}</td><td>${x.p6m}</td><td>${x.p1y}</td>";
const after="<td>${fxPoint2(x.p1m)}</td><td>${fxPoint2(x.p3m)}</td><td>${fxPoint2(x.p6m)}</td><td>${fxPoint2(x.p1y)}</td>";
if(app.includes(before))app=app.replace(before,after);
if(!app.includes('fxPoint2(x.p1m)'))throw new Error('overview FX swap-point formatter patch failed');
await fs.writeFile('app.js',app);
console.log('Overview FX forward points formatted to 2 decimals.');
