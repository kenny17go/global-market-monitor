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
  renderYield(); renderAlerts(); renderSpreads(); evaluateAlerts();
}
function renderYield(){ drawLine($('#yieldCanvas'), DATA.ust.map(x=>x.yield), {color:'#56aef7'}); }
function spreadRows(){return DATA.crossExchange||[]}
function spreadCalc(x){const sellTwBuyOs=x.twBid-x.osAsk;const buyTwSellOs=x.osBid-x.twAsk;const best=Math.max(sellTwBuyOs,buyTwSellOs);const dir=sellTwBuyOs>=buyTwSellOs?'賣台 / 買海外':'買台 / 賣海外';return {...x,sellTwBuyOs,buyTwSellOs,best,dir}}
function renderSpreads(){
  if(!$('#spreadBody'))return; const type=$('#spreadFilter')?.value||'all'; const only=$('#onlyOpportunity')?.checked||false;
  let rows=spreadRows().map(spreadCalc).filter(x=>type==='all'||x.type===type).filter(x=>!only||x.best>0);
  $('#spreadBody').innerHTML=rows.length?rows.map(x=>`<tr><td><b>${x.name}</b><div class="source-note">${x.underlying}</div></td><td>${x.expiry}</td><td>${x.twCode}<div class="source-note">TAIFEX</div></td><td>${fmt(x.twBid,x.decimals||2)}</td><td>${fmt(x.twAsk,x.decimals||2)}</td><td>${x.osCode}<div class="source-note">${x.osExchange}</div></td><td>${fmt(x.osBid,x.decimals||2)}</td><td>${fmt(x.osAsk,x.decimals||2)}</td><td class="${cls(x.sellTwBuyOs)}">${x.sellTwBuyOs>=0?'+':''}${fmt(x.sellTwBuyOs,x.decimals||2)}</td><td class="${cls(x.buyTwSellOs)}">${x.buyTwSellOs>=0?'+':''}${fmt(x.buyTwSellOs,x.decimals||2)}</td><td><span class="direction ${x.best>0?'opportunity':''}">${x.dir}<br><b>${x.best>=0?'+':''}${fmt(x.best,x.decimals||2)}</b></span></td><td>${x.syncMs} ms</td></tr>`).join(''):`<tr><td colspan="12" class="empty">目前篩選條件下沒有項目</td></tr>`;
  const all=spreadRows().map(spreadCalc), pos=all.filter(x=>x.best>0), best=all.sort((a,b)=>b.best-a.best)[0];
  $('#spreadKpis').innerHTML=`<div class="kpi"><span>監控商品</span><b>${spreadRows().length}</b></div><div class="kpi"><span>正向價差</span><b class="${pos.length?'pos':''}">${pos.length}</b></div><div class="kpi"><span>目前最大價差</span><b>${best?best.name:'—'}</b><small>${best?`${best.best>=0?'+':''}${fmt(best.best,best.decimals||2)} pts`:'—'}</small></div><div class="kpi"><span>資料模式</span><b>DEMO</b><small>待接真實 Bid/Ask</small></div>`;
}
function symbolMap(){ const m={GOLD:DATA.commodities[0].spot,SILVER:DATA.commodities[1].spot,WTI:DATA.commodities[2].spot,BRENT:DATA.commodities[3].spot,USDTWD:DATA.twd.spotBid,USDTWD_1M:DATA.twd.ndf.p1m,USDTWD_3M:DATA.twd.ndf.p3m,SPX:DATA.equities[0].cash,SOX:DATA.equities[2].cash,TAIEX:DATA.equities[3].cash,NIKKEI:DATA.equities[4].cash,TOPIX:DATA.equities[5].cash}; DATA.ust.forEach(x=>m['US'+x.tenor]=x.yield); spreadRows().map(spreadCalc).forEach(x=>{const k=x.key.toUpperCase();m[k+'_TW_SELL_OS_BUY']=x.sellTwBuyOs;m[k+'_TW_BUY_OS_SELL']=x.buyTwSellOs}); return m; }
function evalFormula(s){ const comp=s.match(/(.+?)(>=|<=|>|<|==)(.+)/); if(!comp)return {ok:false,error:'格式需包含 >、<、>=、<='}; const vars=symbolMap(); const evalSide=t=>{ let e=t.toUpperCase(); Object.keys(vars).sort((a,b)=>b.length-a.length).forEach(k=>e=e.replaceAll(k,String(vars[k]))); if(!/^[0-9+\-*/().\s]+$/.test(e))throw new Error('含未知代碼'); return Function('"use strict";return ('+e+')')(); }; try{const l=evalSide(comp[1]),r=evalSide(comp[3]); const op=comp[2]; return {ok:true,hit:({'>':l>r,'<':l<r,'>=':l>=r,'<=':l<=r,'==':l==r})[op],left:l,right:r};}catch(e){return {ok:false,error:e.message};} }
function renderAlerts(){ $('#alertList').innerHTML=alerts.length?alerts.map((a,i)=>{const r=evalFormula(a.formula);return `<div class="alert-item"><span>${a.formula} <small class="source-note">${r.ok?(r.hit?'條件成立':'未觸發'):'公式錯誤'}</small></span><button data-del="${i}">刪除</button></div>`}).join(''):`<div class="source-note">尚未建立警示。可輸入：GOLD/SILVER > 90</div>`; document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{alerts.splice(+b.dataset.del,1);saveAlerts();renderAlerts();}); }
function saveAlerts(){localStorage.setItem('gmmAlerts',JSON.stringify(alerts))}
function evaluateAlerts(){ alerts.forEach(a=>{const r=evalFormula(a.formula); if(!r.ok||!r.hit)return; const now=Date.now(), cd=(a.cooldown||0)*1000; if(a.lastHit && (cd===0 || now-a.lastHit<cd))return; a.lastHit=now; saveAlerts(); if(Notification.permission==='granted') new Notification('Global Market Monitor',{body:`警示觸發：${a.formula}`}); }); }
function switchView(name){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===name+'View'));document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===name));window.scrollTo({top:0,behavior:'smooth'});}
document.querySelectorAll('[data-view]').forEach(x=>x.onclick=()=>switchView(x.dataset.view));
$('#customizeTop').onclick=()=>$('#topPicker').classList.toggle('hidden');
$('#spreadFilter').onchange=renderSpreads; $('#onlyOpportunity').onchange=renderSpreads;
$('#addAlert').onclick=()=>{const f=$('#formulaInput').value.trim(); if(!f)return; const test=evalFormula(f); if(!test.ok)return alert('公式無法解析：'+test.error); alerts.push({formula:f,cooldown:+$('#cooldown').value,lastHit:0}); saveAlerts(); $('#formulaInput').value=''; renderAlerts();};
$('#notifyBtn').onclick=async()=>{if(!('Notification'in window))return alert('此瀏覽器不支援通知'); const p=await Notification.requestPermission(); alert(p==='granted'?'通知已啟用':'通知未啟用');};
async function refresh(){try{$('#feedStatus').textContent='更新中';const raw=await MarketProviders.load(); DATA=MarketProviders.simulate(raw); $('#feedStatus').textContent='資料已更新';render();}catch(e){console.error(e);$('#feedStatus').textContent='資料讀取失敗';}}
refresh(); setInterval(refresh,(window.MARKET_MONITOR_CONFIG?.refreshMs)||15000); window.addEventListener('resize',()=>{if(DATA)renderYield();});
