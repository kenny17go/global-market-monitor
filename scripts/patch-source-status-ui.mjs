import fs from 'node:fs/promises';

let app=await fs.readFile('app.js','utf8');
let styles=await fs.readFile('styles.css','utf8');

const helpers=`
function quoteTimeLabel(q){
  const raw=q?.quoteTimestamp||q?.quoteDate||'';
  if(!raw)return '更新時間 —';
  if(/^\\d{8}$/.test(String(raw)))return '更新 '+String(raw).slice(0,4)+'/'+String(raw).slice(4,6)+'/'+String(raw).slice(6,8);
  const d=new Date(raw);if(Number.isNaN(d.getTime()))return '更新 '+raw;
  return '更新 '+d.toLocaleString('zh-TW',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
}
function quoteStatusClass(mode){const m=String(mode||'').toUpperCase();return m==='LIVE'?'live':m.includes('DELAY')?'delayed':m.includes('OFFICIAL')?'official':'neutral'}
function quoteMetaHtml(q){const mode=q?.quoteMode||'SOURCE';const source=q?.source||q?.exchange||'—';return '<div class="quote-meta"><span class="quote-status '+quoteStatusClass(mode)+'">'+mode+'</span><span>'+source+'</span><span>'+quoteTimeLabel(q)+'</span></div>'}
`;
if(!app.includes('function quoteTimeLabel(q)')) app=app.replace('function catalogNote(x){',helpers+'\nfunction catalogNote(x){');

app=app.replace(/function renderCatalog\(\)\{[\s\S]*?renderCustomProducts\(\)\}/,`function renderCatalog(){if(!$('#catalogBody'))return;const type=$('#catalogFilter')?.value||'all',rows=catalogRows().filter(x=>type==='all'||x.category===type);$('#catalogBody').innerHTML=rows.map(x=>\`<tr><td><span class="category-pill">\${x.category}</span></td><td><b>\${x.name}</b><div class="source-note">\${x.underlying}</div></td><td><b>\${x.tw.code}</b><div class="source-note">\${x.tw.expiry?monthLabel(x.tw.expiry):'—'}</div>\${quoteMetaHtml(x.tw)}</td><td>\${qfmt(x.tw.bid,x.tw.code)}</td><td>\${qfmt(x.tw.ask,x.tw.code)}</td><td>\${qfmt(x.tw.last,x.tw.code)}</td><td>\${x.os.exchange}</td><td><b>\${x.os.code}</b>\${quoteMetaHtml(x.os)}</td><td>\${qfmt(x.os.bid,x.os.code)}</td><td>\${qfmt(x.os.ask,x.os.code)}</td><td>\${qfmt(x.os.last,x.os.code)}</td><td class="catalog-note">\${catalogNote(x)}</td></tr>\`).join('')||\`<tr><td colspan="12" class="empty">此分類目前沒有項目</td></tr>\`;const cats=[...new Set(catalogRows().map(x=>x.category))];$('#catalogSummary').innerHTML=\`<div class="kpi"><span>可比較商品</span><b>\${catalogRows().length}</b><small>跨市場 / 同標的</small></div><div class="kpi"><span>商品分類</span><b>\${cats.length}</b><small>\${cats.join(' / ')}</small></div><div class="kpi"><span>原始欄位</span><b>\${Object.keys(quoteTokenMap()).length}</b><small>Bid / Ask / Last</small></div><div class="kpi"><span>公式模式</span><b>自由</b><small>+ − × ÷ / 比較運算</small></div>\`;renderTokenOptions();if(!costInitialized)initCostLab();else calcCostLab();renderCustomProducts()}`);

app=app.replace(/function renderSpecSummary\(row\)\{[\s\S]*?el\.innerHTML=card\(row\.tw\.exchange\|\|'TAIFEX',row\.tw,a,ma\)\+card\(row\.os\.exchange,row\.os,b,mb\)\}/,`function renderSpecSummary(row){const el=$('#contractSpecSummary');if(!el||!row)return;const a=specFor(row.tw.id),b=specFor(row.os.id),ma=marginFor(row.tw.id),mb=marginFor(row.os.id),target=row.underlying||row.name||'—';const card=(title,q,s,m)=>\`<div class="spec-card"><div><b>\${title} \${q.code}</b><span class="verified-badge">規格預設</span></div><div class="spec-line"><span>標的</span><strong>\${target}</strong></div><div class="spec-line"><span>乘數</span><strong>\${tidy(s.multiplier,6)}</strong></div><div class="spec-line"><span>Tick</span><strong>\${fixedInput(s.tick,8)}</strong></div><div class="spec-line"><span>幣別</span><strong>\${s.currency}</strong></div><div class="spec-line"><span>原始保證金</span><strong>\${marginDisplay(m)}</strong></div><div class="source-note">\${m.source}\${m.asOf&&m.asOf!=='dynamic'?' · '+m.asOf:''}</div><div class="spec-line"><span>到期週期</span><strong>\${s.cycle}</strong></div><div class="spec-source-block"><span>行情</span>\${quoteMetaHtml(q)}</div></div>\`;el.innerHTML=card(row.tw.exchange||'TAIFEX',row.tw,a,ma)+card(row.os.exchange,row.os,b,mb)}`);

const css=`
/* Quote source / freshness badges */
.quote-meta{display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin-top:4px;font-size:9px;color:var(--muted);line-height:1.3}.quote-status{border:1px solid #395064;border-radius:999px;padding:2px 5px;font-size:8px;font-weight:700;letter-spacing:.03em}.quote-status.live{border-color:#23865a;color:#79e0ad;background:rgba(38,166,91,.08)}.quote-status.delayed{border-color:#8a6a2b;color:#f0ca70;background:rgba(220,170,60,.07)}.quote-status.official{border-color:#2d6f9e;color:#8dd1ff;background:rgba(45,111,158,.09)}.quote-status.neutral{color:#9aafbe}.spec-source-block{margin-top:8px;padding-top:7px;border-top:1px solid var(--line)}.spec-source-block>span{font-size:10px;color:var(--muted)}.spec-source-block .quote-meta{margin-top:4px}@media(max-width:700px){.quote-meta{font-size:8px;gap:4px}.quote-status{font-size:7px}}
`;
if(!styles.includes('/* Quote source / freshness badges */')) styles+='\n'+css;

await fs.writeFile('app.js',app);
await fs.writeFile('styles.css',styles);
