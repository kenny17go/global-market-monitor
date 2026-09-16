import fs from 'node:fs/promises';

let index=await fs.readFile('index.html','utf8');
let app=await fs.readFile('app.js','utf8');
let styles=await fs.readFile('styles.css','utf8');

const block=`
          <div id="taifexSettlementNdf" class="settlement-ndf-box">
            <div class="settlement-ndf-head"><div><b>TAIFEX 結算日 NDF</b><small>台幣黃金 TGF / 布蘭特原油 BRF · 近月、次月自動 rollover</small></div><div id="settlementNdfSource" class="source-note">載入中…</div></div>
            <div class="table-wrap"><table class="settlement-ndf-table"><thead><tr><th>商品</th><th>合約</th><th>月份</th><th>預估最後結算日</th><th>天數</th><th>NDF Bid</th><th>NDF Ask</th><th>NDF Mid</th><th>Swap Mid</th></tr></thead><tbody id="settlementNdfBody"></tbody></table></div>
            <div class="settlement-ndf-note">NDF 使用 Offshore 曲線（NetDania，失效時 Barchart）依實際剩餘日數線性插補。近月/次月直接讀取 TAIFEX 官方有效合約並自動換月。結算日依 TAIFEX 契約規則推算；遇交易所臨時調整時以官方公告為準。</div>
          </div>`;

index=index.replace(/\s*<div id="brokenDateForward"[\s\S]*?<div class="broken-date-note">[\s\S]*?<\/div>\s*<\/div>/g,'');
index=index.replace(/\s*<div id="taifexSettlementNdf"[\s\S]*?<div class="settlement-ndf-note">[\s\S]*?<\/div>\s*<\/div>/g,'');
index=index.replace(/(\s*<div class="fx-focus-note">)/,`\n${block}\n$1`);

const js=`
let TAIFEX_SETTLEMENT_DATA_PROMISE=null;
const SETTLEMENT_TENOR_DAYS={'1W':7,'1M':30,'3M':90,'6M':180,'1Y':365};
const TW_HOLIDAYS_2026=new Set(['2026-09-25','2026-09-28','2026-10-09','2026-10-26','2026-12-25']);
const UK_HOLIDAYS_2026=new Set(['2026-08-31','2026-12-25','2026-12-28']);
function sDate(d){return d.toISOString().slice(0,10)}
function isWeekend(d){const x=d.getUTCDay();return x===0||x===6}
function addDays(d,n){const x=new Date(d);x.setUTCDate(x.getUTCDate()+n);return x}
function isBiz(d,holidays){return !isWeekend(d)&&!holidays.has(sDate(d))}
function prevBiz(d,holidays){let x=addDays(d,-1);while(!isBiz(x,holidays))x=addDays(x,-1);return x}
function nextBiz(d,holidays){let x=addDays(d,1);while(!isBiz(x,holidays))x=addDays(x,1);return x}
function nthNextBiz(d,n,holidays){let x=new Date(d);for(let i=0;i<n;i++)x=nextBiz(x,holidays);return x}
function monthEnd(y,m){return new Date(Date.UTC(y,m,0))}
function tgfSettlement(month){const y=Number(month.slice(0,4)),m=Number(month.slice(4,6));let last=monthEnd(y,m);while(!isBiz(last,TW_HOLIDAYS_2026))last=prevBiz(last,TW_HOLIDAYS_2026);return prevBiz(last,TW_HOLIDAYS_2026)}
function brfSettlement(month){const y=Number(month.slice(0,4)),m=Number(month.slice(4,6));let py=y,pm=m-2;while(pm<=0){pm+=12;py--}let ltd=monthEnd(py,pm);while(!isBiz(ltd,UK_HOLIDAYS_2026))ltd=prevBiz(ltd,UK_HOLIDAYS_2026);const tomorrow=addDays(ltd,1);if((ltd.getUTCMonth()===11&&ltd.getUTCDate()>=30)||(tomorrow.getUTCMonth()===11&&[25,26].includes(tomorrow.getUTCDate())))ltd=prevBiz(ltd,UK_HOLIDAYS_2026);return nthNextBiz(ltd,2,TW_HOLIDAYS_2026)}
function ndfNodes(bucket){return Object.entries(SETTLEMENT_TENOR_DAYS).map(([tenor,days])=>{const q=bucket?.curve?.[tenor];return q&&q.mid!=null?{tenor,days,bid:q.bid??null,ask:q.ask??null,mid:q.mid}:null}).filter(Boolean).sort((a,b)=>a.days-b.days)}
function ndfInterp(bucket,days,spot){const n=ndfNodes(bucket);if(n.length<2)return null;const lo=n.filter(x=>x.days<=days).at(-1),hi=n.find(x=>x.days>=days);if(!lo||!hi)return null;const w=lo.days===hi.days?0:(days-lo.days)/(hi.days-lo.days),lerp=(a,b)=>a==null||b==null?null:Number(a)+(Number(b)-Number(a))*w;const bid=lerp(lo.bid,hi.bid),ask=lerp(lo.ask,hi.ask),mid=lerp(lo.mid,hi.mid);return {bid:bid!=null&&spot?.bid!=null?spot.bid+bid:null,ask:ask!=null&&spot?.ask!=null?spot.ask+ask:null,mid:mid!=null&&spot?.mid!=null?spot.mid+mid:null,swapMid:mid,from:lo.tenor,to:hi.tenor}}
async function getTaifexSettlementData(){if(!TAIFEX_SETTLEMENT_DATA_PROMISE)TAIFEX_SETTLEMENT_DATA_PROMISE=fetch('./data/taifex-latest.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);return TAIFEX_SETTLEMENT_DATA_PROMISE}
function daysBetween(a,b){return Math.max(0,Math.ceil((b-a)/86400000))}
async function renderTaifexSettlementNdf(){const body=$('#settlementNdfBody'),src=$('#settlementNdfSource');if(!body)return;const tx=await getTaifexSettlementData(),fx=DATA?.usdtwdFx,off=fx?.offshore;if(!tx?.products||!off){body.innerHTML='<tr><td colspan="9">資料載入中或來源暫時不可用</td></tr>';return}const base=fx?.meta?.generatedAt?new Date(fx.meta.generatedAt):new Date(),today=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth(),base.getUTCDate()));const rows=[];for(const [code,name,fn] of [['TGF','台幣黃金',tgfSettlement],['BRF','布蘭特原油',brfSettlement]]){const months=[...new Set((tx.products?.[code]?.contracts||[]).map(x=>String(x.month||'')).filter(x=>/^\\d{6}$/.test(x)))].sort().slice(0,2);months.forEach((month,i)=>{const settle=fn(month),days=daysBetween(today,settle),q=ndfInterp(off,days,fx.spot);rows.push({code,name,label:i===0?'近月':'次月',month,settle,days,q})})}const f=v=>v==null?'—':Number(v).toFixed(4);body.innerHTML=rows.map(r=>'<tr><td><b>'+r.name+'</b><small>'+r.code+'</small></td><td>'+r.label+'</td><td>'+r.month+'</td><td>'+sDate(r.settle)+'</td><td>'+r.days+'</td><td>'+f(r.q?.bid)+'</td><td>'+f(r.q?.ask)+'</td><td><b>'+f(r.q?.mid)+'</b></td><td>'+f(r.q?.swapMid)+'</td></tr>').join('')||'<tr><td colspan="9">找不到有效合約</td></tr>';if(src)src.textContent='NDF '+(off?.source||'—')+' · '+(off?.mode||'—')+' · 自動換月'}
`;

if(!app.includes('function renderTaifexSettlementNdf('))app=app.replace(/function renderUsdtwdFx\(\)\s*\{/,js+'\nfunction renderUsdtwdFx(){');
if(!app.includes('setTimeout(renderTaifexSettlementNdf,0)'))app=app.replace(/function renderUsdtwdFx\(\)\s*\{/,'function renderUsdtwdFx(){setTimeout(renderTaifexSettlementNdf,0);');

const css=`
.settlement-ndf-box{margin:12px;border:1px solid var(--line);border-radius:9px;background:#071827;overflow:hidden}.settlement-ndf-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:11px 12px;border-bottom:1px solid var(--line)}.settlement-ndf-head>div:first-child{display:grid;gap:3px}.settlement-ndf-head small,.settlement-ndf-note{color:var(--muted);font-size:10px}.settlement-ndf-table{min-width:880px}.settlement-ndf-table th,.settlement-ndf-table td{text-align:right}.settlement-ndf-table th:first-child,.settlement-ndf-table td:first-child{text-align:left}.settlement-ndf-table td small{display:block;color:var(--muted);font-size:9px}.settlement-ndf-note{padding:9px 12px 11px;border-top:1px solid var(--line)}@media(max-width:700px){.settlement-ndf-head{flex-direction:column}}
`;
if(!styles.includes('.settlement-ndf-box{'))styles+='\n'+css;
await fs.writeFile('index.html',index);await fs.writeFile('app.js',app);await fs.writeFile('styles.css',styles);console.log('TAIFEX settlement-date NDF panel installed.');
