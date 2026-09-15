const $ = s => document.querySelector(s);
const fmt = (v,d=2)=>Number(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const cls = v => Number(v)>=0?'pos':'neg';
let DATA=null;
let alerts = JSON.parse(localStorage.getItem('gmmAlerts')||'[]');
let selectedTop = JSON.parse(localStorage.getItem('gmmTopCards')||'null') || ['SPX','SOX','TAIEX','NIKKEI','GOLD','WTI','USDTWD'];

function drawLine(canvas, arr, opts={}){
  const dpr=devicePixelRatio||1, w=canvas.clientWidth||300, h=canvas.clientHeight||120;
  canvas.width=w*dpr; canvas.height=h*dpr; const c=canvas.getContext('2d'); c.scale(dpr,dpr); c.clearRect(0,0,w,h);
  if(!arr||arr.length<2)return; const min=Math.min(...arr), max=Math.max(...arr), pad=(max-min||1)*.15; const lo=min-pad, hi=max+pad;
  c.strokeStyle='#173b58'; c.lineWidth=1; for(let i=1;i<4;i++){const y=h*i/4;c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke()}
  c.strokeStyle=opts.color||'#22df91'; c.lineWidth=2; c.beginPath(); arr.forEach((v,i)=>{const x=i/(arr.length-1)*(w-8)+4; const y=h-((v-lo)/(hi-lo))*h; i?c.lineTo(x,y):c.moveTo(x,y)}); c.stroke();
}
function sparkSvg(arr,color){const w=160,h=34,min=Math.min(...arr),max=Math.max(...arr),r=max-min||1;const pts=arr.map((v,i)=>`${i/(arr.length-1)*w},${h-(v-min)/r*h}`).join(' ');return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="32" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2"/></svg>`}
function topUniverse(){
  const map={}; (DATA.top||[]).forEach(x=>map[x.id]=x);
  const add=(id,label,value,pct,change=0)=>{if(!map[id])map[id]={id,label,value,pct,change}};
  const eq=n=>DATA.equities.find(x=>x.name===n); const cmd=n=>DATA.commodities.find(x=>x.name===n); const fx=p=>DATA.fx.find(x=>x.pair===p);
  if(eq('Nasdaq-100')) add('NDX','Nasdaq-100',eq('Nasdaq-100').cash,eq('Nasdaq-100').pct);
  if(eq('東證 TOPIX')) add('TOPIX','東證 TOPIX',eq('東證 TOPIX').cash,eq('東證 TOPIX').pct);
  if(cmd('白銀')) add('SILVER','白銀 XAG/USD',cmd('白銀').spot,cmd('白銀').pct);
  if(cmd('Brent 原油')) add('BRENT','Brent 原油',cmd('Brent 原油').spot,cmd('Brent 原油').pct);
  if(fx('USD/JPY')) add('USDJPY','USD/JPY',fx('USD/JPY').bid,0,fx('USD/JPY').change);
  if(fx('EUR/USD')) add('EURUSD','EUR/USD',fx('EUR/USD').bid,0,fx('EUR/USD').change);
  return map;
}
function renderTopPicker(){
  const u=topUniverse(); const order=['SPX','NDX','SOX','TAIEX','NIKKEI','TOPIX','GOLD','SILVER','WTI','BRENT','USDTWD','USDJPY','EURUSD'];
  $('#topPicker').innerHTML=`<div class="picker-head"><b>選擇最上方行情</b><span>最多 8 個，設定會保存在此瀏覽器</span></div><div class="picker-grid">${order.filter(id=>u[id]).map(id=>`<label class="chip"><input type="checkbox" data-top="${id}" ${selectedTop.includes(id)?'checked':''}>${u[id].label}</label>`).join('')}</div>`;
  document.querySelectorAll('[data-top]').forEach(cb=>cb.onchange=()=>{const id=cb.dataset.top;if(cb.checked){if(selectedTop.length>=8){cb.checked=false;return alert('最上方最多顯示 8 個項目');}selectedTop.push(id)}else{selectedTop=selectedTop.filter(x=>x!==id);if(!selectedTop.length){selectedTop=['SPX'];}}localStorage.setItem('gmmTopCards',JSON.stringify(selectedTop));renderTopCards();});
}
function renderTopCards(){
  const u=topUniverse(); const items=selectedTop.map(id=>u[id]).filter(Boolean);
  $('#topCards').innerHTML=items.map(x=>{const d=(x.id==='USDTWD'||x.id==='USDJPY'||x.id==='EURUSD')?3:2; const arr=DATA.series?.[x.id]||[x.value*.998,x.value*.999,x.value];return `<div class="card"><div class="label">${x.label}</div><div class="value">${fmt(x.value,d)}</div><div class="${cls(x.pct||x.change)}">${x.change>=0?'+':''}${fmt(x.change||0,d)}　${x.pct!=null?`${x.pct>=0?'+':''}${fmt(x.pct,2)}%`:''}</div><div class="spark">${sparkSvg(arr,(x.pct||x.change)>=0?'#22df91':'#ff5b62')}</div></div>`}).join('');
}
function render(){ if(!DATA)return; $('#asof').textContent=new Date(DATA.asOf).toLocaleString('zh-TW');
  renderTopPicker(); renderTopCards();
  $('#fxBody').innerHTML=DATA.fx.map(x=>`<tr><td>${x.pair}</td><td>${x.bid}</td><td>${x.ask}</td><td class="${cls(x.change)}">${x.change>=0?'+':''}${x.change}</td><td>${x.p1m}</td><td>${x.p3m}</td><td>${x.p6m}</td><td>${x.p1y}</td></tr>`).join('')+`<tr><td><b>USD/TWD Spot</b></td><td>${DATA.twd.spotBid}</td><td>${DATA.twd.spotAsk}</td><td>—</td><td colspan="4" class="source-note">Spot 與下方兩條 curve 分開</td></tr><tr><td>↳ Offshore NDF (${DATA.twd.ndf.source})</td><td>—</td><td>—</td><td>—</td><td>${DATA.twd.ndf.p1m}</td><td>${DATA.twd.ndf.p3m}</td><td>${DATA.twd.ndf.p6m}</td><td>${DATA.twd.ndf.p1y}</td></tr><tr><td>↳ Onshore Fwd (${DATA.twd.onshore.source})</td><td>—</td><td>—</td><td>—</td><td>${DATA.twd.onshore.p1m}</td><td>${DATA.twd.onshore.p3m}</td><td>${DATA.twd.onshore.p6m}</td><td>${DATA.twd.onshore.p1y}</td></tr>`;
  $('#eqBody').innerHTML=DATA.equities.map(x=>`<tr><td>${x.name}<div class="source-note">${x.futureCode}</div></td><td>${fmt(x.cash)}</td><td>${fmt(x.future)}</td><td class="${cls(x.basis)}">${x.basis>=0?'+':''}${fmt(x.basis)}</td><td class="${cls(x.pct)}">${x.pct>=0?'+':''}${fmt(x.pct)}%</td></tr>`).join('');
  $('#cmdBody').innerHTML=DATA.commodities.map(x=>`<tr><td>${x.name}<div class="source-note">${x.futureCode}</div></td><td>${fmt(x.spot)}</td><td>${fmt(x.future)}</td><td class="${cls(x.basis)}">${x.basis>=0?'+':''}${fmt(x.basis)}</td><td class="${cls(x.pct)}">${x.pct>=0?'+':''}${fmt(x.pct)}%</td></tr>`).join('');
  $('#rateBody').innerHTML=DATA.rates.map(x=>`<tr><td>${x.name}</td><td>${fmt(x.rate)}%</td><td>${x.next}</td></tr>`).join('');
  renderYield(); renderAlerts(); renderCatalog(); evaluateAlerts();
}
function renderYield(){ drawLine($('#yieldCanvas'), DATA.ust.map(x=>x.yield), {color:'#56aef7'}); }
function catalogRows(){return DATA.crossMarketCatalog||[]}
function quoteTokenMap(){
  const m={USD_TWD_SPOT:DATA.twd?.spotBid};
  catalogRows().forEach(x=>{[x.tw,x.os].forEach(q=>{if(!q?.id)return;m[q.id+'.BID']=q.bid;m[q.id+'.ASK']=q.ask;m[q.id+'.LAST']=q.last;});});
  return m;
}
function catalogNote(x){return x.compare==='inverse'?'報價方向不同：可用倒數換向':x.compare==='conversion'?'需加入匯率 / 單位換算':'可直接比較，但仍須對齊月份與時間'}
function renderCatalog(){
  if(!$('#catalogBody'))return; const type=$('#catalogFilter')?.value||'all'; const rows=catalogRows().filter(x=>type==='all'||x.category===type);
  $('#catalogBody').innerHTML=rows.map(x=>`<tr><td><span class="category-pill">${x.category}</span></td><td><b>${x.name}</b><div class="source-note">${x.underlying}</div></td><td><b>${x.tw.code}</b><div class="source-note">${x.tw.exchange}</div></td><td>${fmt(x.tw.bid,4)}</td><td>${fmt(x.tw.ask,4)}</td><td>${fmt(x.tw.last,4)}</td><td>${x.os.exchange}</td><td><b>${x.os.code}</b></td><td>${fmt(x.os.bid,4)}</td><td>${fmt(x.os.ask,4)}</td><td>${fmt(x.os.last,4)}</td><td class="catalog-note">${catalogNote(x)}</td></tr>`).join('')||`<tr><td colspan="12" class="empty">此分類目前沒有項目</td></tr>`;
  const cats=[...new Set(catalogRows().map(x=>x.category))];
  $('#catalogSummary').innerHTML=`<div class="kpi"><span>可比較商品</span><b>${catalogRows().length}</b><small>TAIFEX × Overseas</small></div><div class="kpi"><span>商品分類</span><b>${cats.length}</b><small>${cats.join(' / ')}</small></div><div class="kpi"><span>原始欄位</span><b>${Object.keys(quoteTokenMap()).length}</b><small>Bid / Ask / Last</small></div><div class="kpi"><span>公式模式</span><b>自由</b><small>+ − × ÷ / 比較運算</small></div>`;
  renderTokenOptions();
}
function renderTokenOptions(){
  const s=$('#tokenSelect'); if(!s)return; const current=s.value; const groups={};
  catalogRows().forEach(x=>{groups[x.category]??=[];groups[x.category].push({label:`${x.name}｜${x.tw.exchange} ${x.tw.code}`,id:x.tw.id});groups[x.category].push({label:`${x.name}｜${x.os.exchange} ${x.os.code}`,id:x.os.id});});
  s.innerHTML='<option value="">選擇報價欄位…</option>'+Object.entries(groups).map(([g,arr])=>`<optgroup label="${g}">${arr.map(q=>['BID','ASK','LAST'].map(f=>`<option value="${q.id}.${f}">${q.label} · ${f}</option>`).join('')).join('')}</optgroup>`).join('')+`<optgroup label="其他"><option value="USD_TWD_SPOT">USD/TWD Spot</option></optgroup>`; if([...s.options].some(o=>o.value===current))s.value=current;
}
function evalMarketFormula(raw){
  try{
    let e=raw.trim(); if(!e)return {ok:false,error:'請輸入公式'}; const vars=quoteTokenMap();
    Object.keys(vars).sort((a,b)=>b.length-a.length).forEach(k=>e=e.split(k).join(String(vars[k])));
    if(/[A-Za-z_]/.test(e))throw new Error('含未知欄位代碼');
    const comp=e.match(/^(.+?)(>=|<=|==|>|<)(.+)$/);
    const calc=t=>{if(!/^[0-9eE+\-*/().\s]+$/.test(t))throw new Error('公式含不支援字元');return Function('"use strict";return ('+t+')')()};
    if(comp){const l=calc(comp[1]),r=calc(comp[3]),op=comp[2];return {ok:true,type:'condition',value:({'>':l>r,'<':l<r,'>=':l>=r,'<=':l<=r,'==':l==r})[op],left:l,right:r};}
    return {ok:true,type:'number',value:calc(e)};
  }catch(err){return {ok:false,error:err.message}}
}
function calcFormula(){const r=evalMarketFormula($('#spreadFormula').value);const el=$('#formulaResult');if(!r.ok){el.className='formula-result neg';el.textContent='公式錯誤：'+r.error;return}el.className='formula-result '+(r.type==='condition'?(r.value?'pos':'neg'):'pos');el.textContent=r.type==='condition'?`條件 ${r.value?'成立':'未成立'}｜左值 ${fmt(r.left,6)} / 右值 ${fmt(r.right,6)}`:`計算結果：${fmt(r.value,8)}`;}
function symbolMap(){ const m={GOLD:DATA.commodities[0].spot,SILVER:DATA.commodities[1].spot,WTI:DATA.commodities[2].spot,BRENT:DATA.commodities[3].spot,USDTWD:DATA.twd.spotBid,USDTWD_1M:DATA.twd.ndf.p1m,USDTWD_3M:DATA.twd.ndf.p3m,SPX:DATA.equities[0].cash,SOX:DATA.equities[2].cash,TAIEX:DATA.equities[3].cash,NIKKEI:DATA.equities[4].cash,TOPIX:DATA.equities[5].cash}; DATA.ust.forEach(x=>m['US'+x.tenor]=x.yield); Object.assign(m,quoteTokenMap()); return m; }
function evalFormula(s){ const comp=s.match(/(.+?)(>=|<=|>|<|==)(.+)/); if(!comp)return {ok:false,error:'格式需包含 >、<、>=、<='}; const vars=symbolMap(); const evalSide=t=>{ let e=t.toUpperCase(); Object.keys(vars).sort((a,b)=>b.length-a.length).forEach(k=>e=e.replaceAll(k,String(vars[k]))); if(!/^[0-9+\-*/().\s]+$/.test(e))throw new Error('含未知代碼'); return Function('"use strict";return ('+e+')')(); }; try{const l=evalSide(comp[1]),r=evalSide(comp[3]); const op=comp[2]; return {ok:true,hit:({'>':l>r,'<':l<r,'>=':l>=r,'<=':l<=r,'==':l==r})[op],left:l,right:r};}catch(e){return {ok:false,error:e.message};} }
function renderAlerts(){ $('#alertList').innerHTML=alerts.length?alerts.map((a,i)=>{const r=evalFormula(a.formula);return `<div class="alert-item"><span>${a.formula} <small class="source-note">${r.ok?(r.hit?'條件成立':'未觸發'):'公式錯誤'}</small></span><button data-del="${i}">刪除</button></div>`}).join(''):`<div class="source-note">尚未建立警示。可輸入：GOLD/SILVER > 90</div>`; document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{alerts.splice(+b.dataset.del,1);saveAlerts();renderAlerts();}); }
function saveAlerts(){localStorage.setItem('gmmAlerts',JSON.stringify(alerts))}
function evaluateAlerts(){ alerts.forEach(a=>{const r=evalFormula(a.formula); if(!r.ok||!r.hit)return; const now=Date.now(), cd=(a.cooldown||0)*1000; if(a.lastHit && (cd===0 || now-a.lastHit<cd))return; a.lastHit=now; saveAlerts(); if(Notification.permission==='granted') new Notification('Global Market Monitor',{body:`警示觸發：${a.formula}`}); }); }
function switchView(name){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===name+'View'));document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===name));window.scrollTo({top:0,behavior:'smooth'});}
document.querySelectorAll('[data-view]').forEach(x=>x.onclick=()=>switchView(x.dataset.view));
$('#customizeTop').onclick=()=>$('#topPicker').classList.toggle('hidden');
if($('#catalogFilter')) $('#catalogFilter').onchange=renderCatalog;
if($('#insertToken')) $('#insertToken').onclick=()=>{const t=$('#tokenSelect').value;if(t){const ta=$('#spreadFormula');ta.value+=(ta.value&& !ta.value.endsWith(' ')?' ':'')+t;ta.focus();}};
document.querySelectorAll('[data-op]').forEach(b=>b.onclick=()=>{const ta=$('#spreadFormula');ta.value+=b.dataset.op;ta.focus();});
document.querySelectorAll('[data-example]').forEach(b=>b.onclick=()=>{$('#spreadFormula').value=b.dataset.example;calcFormula();});
if($('#calcSpreadFormula')) $('#calcSpreadFormula').onclick=calcFormula;
if($('#clearFormula')) $('#clearFormula').onclick=()=>{$('#spreadFormula').value='';$('#formulaResult').className='formula-result';$('#formulaResult').textContent='等待輸入公式';};
if($('#saveSpreadFormula')) $('#saveSpreadFormula').onclick=()=>{const f=$('#spreadFormula').value.trim();if(!f)return;const r=evalMarketFormula(f);if(!r.ok)return alert('公式無法解析：'+r.error);alerts.push({formula:f,cooldown:300,lastHit:0});saveAlerts();renderAlerts();alert('已加入監控清單');};
$('#addAlert').onclick=()=>{const f=$('#formulaInput').value.trim(); if(!f)return; const test=evalFormula(f); if(!test.ok)return alert('公式無法解析：'+test.error); alerts.push({formula:f,cooldown:+$('#cooldown').value,lastHit:0}); saveAlerts(); $('#formulaInput').value=''; renderAlerts();};
$('#notifyBtn').onclick=async()=>{if(!('Notification'in window))return alert('此瀏覽器不支援通知'); const p=await Notification.requestPermission(); alert(p==='granted'?'通知已啟用':'通知未啟用');};
async function refresh(){try{$('#feedStatus').textContent='更新中';const raw=await MarketProviders.load(); DATA=MarketProviders.simulate(raw); $('#feedStatus').textContent='資料已更新';render();}catch(e){console.error(e);$('#feedStatus').textContent='資料讀取失敗';}}
refresh(); setInterval(refresh,(window.MARKET_MONITOR_CONFIG?.refreshMs)||15000); window.addEventListener('resize',()=>{if(DATA)renderYield();});
