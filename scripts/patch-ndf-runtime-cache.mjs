import fs from 'node:fs/promises';

let index=await fs.readFile('index.html','utf8');
let app=await fs.readFile('app.js','utf8');

const VERSION='20260916-ndf3';
index=index.replace(/providers\.js(?:\?v=[^"']+)?/g,`providers.js?v=${VERSION}`);
index=index.replace(/app\.js(?:\?v=[^"']+)?/g,`app.js?v=${VERSION}`);

app=app.replace(/setTimeout\(renderTaifexSettlementNdf,0\);/g,`setTimeout(()=>renderTaifexSettlementNdf().catch(e=>{console.error('TAIFEX settlement NDF render failed',e);const s=document.getElementById('settlementNdfSource'),b=document.getElementById('settlementNdfBody');if(s)s.textContent='NDF 載入失敗';if(b)b.innerHTML='<tr><td colspan="9">NDF 計算錯誤：'+String(e?.message||e)+'</td></tr>'}),0);`);

await fs.writeFile('index.html',index);
await fs.writeFile('app.js',app);
console.log('Applied NDF runtime guard and cache-busted frontend assets:',VERSION);
