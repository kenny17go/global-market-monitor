import fs from 'node:fs/promises';

const appPath='app.js';
let app=await fs.readFile(appPath,'utf8');
const data=JSON.parse(await fs.readFile('data/latest.json','utf8'));

// Comparable Products: keep the Taiwan-index target label compact.
for (const row of data.crossMarketCatalog || []) {
  if (row?.category === '台灣指數' && row?.tw?.code === 'TX' && row?.os?.code === 'MTX') {
    row.name = '臺指期';
    row.underlying = 'TAIEX';
  }
}
await fs.writeFile('data/latest.json', JSON.stringify(data,null,2)+'\n');

// Contract Spec & Cost Lab: show the underlying target in both spec cards.
const specFn=`function renderSpecSummary(row){const el=$('#contractSpecSummary');if(!el||!row)return;const a=specFor(row.tw.id),b=specFor(row.os.id),ma=marginFor(row.tw.id),mb=marginFor(row.os.id),target=row.underlying||row.name||'—';const card=(title,q,s,m)=>\`<div class="spec-card"><div><b>\${title} \${q.code}</b><span class="verified-badge">規格預設</span></div><div class="spec-line"><span>標的</span><strong>\${target}</strong></div><div class="spec-line"><span>乘數</span><strong>\${tidy(s.multiplier,6)}</strong></div><div class="spec-line"><span>Tick</span><strong>\${fixedInput(s.tick,8)}</strong></div><div class="spec-line"><span>幣別</span><strong>\${s.currency}</strong></div><div class="spec-line"><span>原始保證金</span><strong>\${marginDisplay(m)}</strong></div><div class="source-note">\${m.source}\${m.asOf&&m.asOf!=='dynamic'?' · '+m.asOf:''}</div><div class="spec-line"><span>到期週期</span><strong>\${s.cycle}</strong></div></div>\`;el.innerHTML=card(row.tw.exchange||'TAIFEX',row.tw,a,ma)+card(row.os.exchange,row.os,b,mb)}`;

if (/function renderSpecSummary\(row\)\{[\s\S]*?\}\nfunction renderMonthSummary/.test(app)) {
  app=app.replace(/function renderSpecSummary\(row\)\{[\s\S]*?\}\nfunction renderMonthSummary/, specFn+'\nfunction renderMonthSummary');
} else {
  throw new Error('renderSpecSummary() not found');
}

await fs.writeFile(appPath,app);
console.log('Applied compact TAIEX label and underlying target rows.');
