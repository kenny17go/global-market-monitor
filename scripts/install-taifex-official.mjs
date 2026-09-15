import fs from 'node:fs/promises';

const appPath='app.js';
let app=await fs.readFile(appPath,'utf8');
let index=await fs.readFile('index.html','utf8');
const data=JSON.parse(await fs.readFile('data/latest.json','utf8'));

// ---- Keep only TX + MTX for Taiwan index comparison ----
app=app.replace('TX:0,MTX:0,TMF:0,','TX:0,MTX:0,');
app=app.replace(/\n\s*TAIFEX_TMF:\{code:'TMF'[^\n]*\},?/g,'');
app=app.replace("label:'TAIEX Futures'","label:'臺指期'");
app=app.replace("label:'Mini-TAIEX Futures'","label:'小型臺指 MTX'");
app=app.replaceAll('TX|MTX|TMF|SPF','TX|MTX|SPF');

// ---- Initial margin registry. Null means the exchange/clearing house uses dynamic margin and no current static number is embedded. ----
const marginBlock=`const INITIAL_MARGINS={
  TAIFEX_TX:{initial:701000,currency:'TWD',asOf:'2026-08-12',source:'TAIFEX'},
  TAIFEX_MTX:{initial:175250,currency:'TWD',asOf:'2026-08-12',source:'TAIFEX'},
  TAIFEX_TJF:{initial:49000,currency:'TWD',asOf:'2026-08-12',source:'TAIFEX'},
  TAIFEX_UDF:{initial:64000,currency:'TWD',asOf:'2026-08-12',source:'TAIFEX'},
  TAIFEX_SPF:{initial:103000,currency:'TWD',asOf:'2026-08-12',source:'TAIFEX'},
  TAIFEX_UNF:{initial:98000,currency:'TWD',asOf:'2026-08-12',source:'TAIFEX'},
  TAIFEX_SXF:{initial:88000,currency:'TWD',asOf:'2026-08-12',source:'TAIFEX'},
  TAIFEX_F1F:{initial:29000,currency:'TWD',asOf:'2026-08-12',source:'TAIFEX'},
  TAIFEX_RHF:{initial:14580,currency:'CNH',asOf:'2026-02-24',source:'TAIFEX'},
  TAIFEX_XEF:{initial:690,currency:'USD',asOf:'2026-02-24',source:'TAIFEX'},
  TAIFEX_XJF:{initial:102000,currency:'JPY',asOf:'2026-02-24',source:'TAIFEX'},
  TAIFEX_XBF:{initial:750,currency:'USD',asOf:'2026-02-24',source:'TAIFEX'},
  TAIFEX_XAF:{initial:590,currency:'USD',asOf:'2026-02-24',source:'TAIFEX'},
  TAIFEX_GDF:{initial:560,currency:'USD',asOf:'2026-07-06',source:'TAIFEX'},
  TAIFEX_TGF:{initial:22000,currency:'TWD',asOf:'2026-07-06',source:'TAIFEX'},
  TAIFEX_BRF:{initial:87000,currency:'TWD',asOf:'2026-07-06',source:'TAIFEX'},
  CME_MES:{initial:2504,currency:'USD',asOf:'2026-07-07',source:'CME margin estimate'},
  CME_MNQ:{initial:3138,currency:'USD',asOf:'2026-09',source:'CME margin estimate'},
  COMEX_MGC:{initial:2040,currency:'USD',asOf:'2026-09',source:'CME margin estimate'},
  COMEX_MGC_TWD:{initial:2040,currency:'USD',asOf:'2026-09',source:'CME margin estimate'},
  CME_6E:{initial:3400,currency:'USD',asOf:'2025-07-01',source:'CME margin estimate'},
  CME_6J:{initial:3800,currency:'USD',asOf:'2025-07-01',source:'CME margin estimate'},
  CME_6B:{initial:2200,currency:'USD',asOf:'2025-07-01',source:'CME margin estimate'},
  CME_6A:{initial:2200,currency:'USD',asOf:'2025-07-01',source:'CME margin estimate'},
  CBOT_MYM:{initial:null,currency:'USD',asOf:'dynamic',source:'CME Clearing dynamic'},
  CME_SOX:{initial:null,currency:'USD',asOf:'dynamic',source:'CME Clearing dynamic'},
  CME_CNH:{initial:null,currency:'CNH',asOf:'dynamic',source:'CME Clearing dynamic'},
  JPX_MINI_TOPIX:{initial:null,currency:'JPY',asOf:'daily',source:'JSCC VaR daily'},
  JPX_NIKKEI225_MINI:{initial:null,currency:'JPY',asOf:'daily',source:'JSCC VaR daily'},
  ICE_Z:{initial:null,currency:'GBP',asOf:'dynamic',source:'ICE Clear Europe dynamic'},
  ICE_BRENT_MINI:{initial:null,currency:'USD',asOf:'dynamic',source:'ICE Clear Europe dynamic'}
};`;
if(/const INITIAL_MARGINS=\{[\s\S]*?\};\n\nconst CONTRACT_SPECS=/.test(app)){
  app=app.replace(/const INITIAL_MARGINS=\{[\s\S]*?\};\n\nconst CONTRACT_SPECS=/,marginBlock+'\n\nconst CONTRACT_SPECS=');
}else{
  app=app.replace('const CONTRACT_SPECS={',marginBlock+'\n\nconst CONTRACT_SPECS={');
}

// ---- Contract spec UI with original margin ----
const specFn=`function marginFor(id){return INITIAL_MARGINS[id]||{initial:null,currency:specFor(id).currency,asOf:'dynamic',source:'交易所動態'}}
function marginDisplay(m){return m?.initial==null?'動態':tidy(m.initial,2)+' '+m.currency}
function renderSpecSummary(row){const el=$('#contractSpecSummary');if(!el||!row)return;const a=specFor(row.tw.id),b=specFor(row.os.id),ma=marginFor(row.tw.id),mb=marginFor(row.os.id);const card=(title,q,s,m)=>\`<div class="spec-card"><div><b>\${title} \${q.code}</b><span class="verified-badge">規格預設</span></div><div class="spec-line"><span>乘數</span><strong>\${tidy(s.multiplier,6)}</strong></div><div class="spec-line"><span>Tick</span><strong>\${fixedInput(s.tick,8)}</strong></div><div class="spec-line"><span>幣別</span><strong>\${s.currency}</strong></div><div class="spec-line"><span>原始保證金</span><strong>\${marginDisplay(m)}</strong></div><div class="source-note">\${m.source}\${m.asOf&&m.asOf!=='dynamic'?' · '+m.asOf:''}</div><div class="spec-line"><span>到期週期</span><strong>\${s.cycle}</strong></div></div>\`;el.innerHTML=card(row.tw.exchange||'TAIFEX',row.tw,a,ma)+card(row.os.exchange,row.os,b,mb)}`;
app=app.replace(/function renderSpecSummary\(row\)\{[\s\S]*?\}\nfunction renderMonthSummary/,specFn+'\nfunction renderMonthSummary');

// ---- Cost lab: show margin requirements by contract count ----
const costFn=`function calcCostLab(){const row=selectedCostRow();if(!row||!$('#costResults'))return;const d=$('#costDirection').value,twField=$('#twPriceField').value,osField=$('#osPriceField').value,twP=costFieldValue(row.tw,twField,$('#twExpiry').value),osP=costFieldValue(row.os,osField,$('#osExpiry').value),twMult=n($('#twMultiplier').value),osMult=n($('#osMultiplier').value),twN=n($('#twContracts').value,1),osN=n($('#osContracts').value,1),twU=n($('#twUnitFactor').value,1),osU=n($('#osUnitFactor').value,1),twFx=n($('#twFx').value,1),osFx=n($('#osFx').value,1),twCost=n($('#twCost').value),osCost=n($('#osCost').value),other=n($('#otherCost').value);const twCmp=normalizedPrice(row,'tw',twP)*twU,osCmp=normalizedPrice(row,'os',osP)*osU,rawSpread=d==='sellTw'?twCmp-osCmp:osCmp-twCmp,twPoint=twMult*twU*twFx,osPoint=osMult*osU*osFx,hedge=twPoint?osPoint/twPoint:0,twNot=twP*twPoint*twN,osNot=osP*osPoint*osN,gross=d==='sellTw'?twNot-osNot:osNot-twNot,costs=twCost*twN+osCost*osN+other,net=gross-costs;const tm=marginFor(row.tw.id),om=marginFor(row.os.id),twMargin=tm.initial==null?null:tm.initial*twN,osMargin=om.initial==null?null:om.initial*osN,twMarginTwd=twMargin==null?null:twMargin*fxToTwd(tm.currency),osMarginTwd=osMargin==null?null:osMargin*fxToTwd(om.currency),knownMarginTwd=(twMarginTwd||0)+(osMarginTwd||0),hasDynamic=twMargin==null||osMargin==null;$('#costResults').innerHTML=\`<div class="cost-metric"><span>台期所選價</span><b>\${qfmt(twP,row.tw.code)}</b><small>\${row.tw.code} \${twField} · \${monthLabel($('#twExpiry').value)}</small></div><div class="cost-metric"><span>海外/比較腿選價</span><b>\${qfmt(osP,row.os.code)}</b><small>\${row.os.code} \${osField} · \${monthLabel($('#osExpiry').value)}</small></div><div class="cost-metric"><span>台灣腿原始保證金</span><b>\${twMargin==null?'動態':tidy(twMargin,2)+' '+tm.currency}</b><small>\${tm.source} · \${twN} 口</small></div><div class="cost-metric"><span>海外/比較腿原始保證金</span><b>\${osMargin==null?'動態':tidy(osMargin,2)+' '+om.currency}</b><small>\${om.source} · \${osN} 口</small></div><div class="cost-metric"><span>已知保證金合計</span><b>\${tidy(knownMarginTwd,0)} TWD</b><small>依目前 Dashboard FX 換算\${hasDynamic?'；不含動態保證金腿':''}</small></div><div class="cost-metric"><span>換算後價格價差</span><b class="\${cls(rawSpread)}">\${rawSpread>=0?'+':''}\${tidy(rawSpread,6)}</b><small>\${row.compare==='inverse'?'海外報價已倒數換向':''}</small></div><div class="cost-metric"><span>每點價值比</span><b>\${tidy(hedge,4)}</b><small>台 / 海外已換成共同幣別</small></div><div class="cost-metric"><span>雙邊總交易成本</span><b>\${tidy(costs,2)}</b><small>含口數；不含保證金</small></div><div class="cost-metric"><span>成本後名目差額</span><b class="\${cls(net)}">\${net>=0?'+':''}\${tidy(net,2)}</b><small>不等同套利獲利</small></div><div class="cost-warning">原始保證金與交易成本是不同概念。海外交易所/清算所可能依波動、組合與帳戶類型動態調整保證金；顯示為「動態」者不以舊數字冒充現行要求。</div>\`}`;
app=app.replace(/function calcCostLab\(\)\{[\s\S]*?\}\nfunction bindCostInputs/,costFn+'\nfunction bindCostInputs');

// ---- Rebuild Taiwan index row: TX vs MTX only ----
const rows=data.crossMarketCatalog||[];
for(let i=rows.length-1;i>=0;i--){const r=rows[i];if(r.category==='台灣指數'||r?.tw?.code==='TMF'||r?.os?.code==='TMF')rows.splice(i,1)}
rows.unshift({
  category:'台灣指數',name:'臺指期 TX / 小型臺指 MTX',underlying:'TAIEX',
  tw:{id:'TAIFEX_TX',code:'TX',exchange:'TAIFEX',bid:0,ask:0,last:0},
  os:{id:'TAIFEX_MTX',code:'MTX',exchange:'TAIFEX',bid:0,ask:0,last:0},
  compare:'direct'
});
for(const e of data.equities||[]){if(e.name==='S&P 500')e.futureCode='MES';if(e.name==='Nasdaq-100')e.futureCode='MNQ';if(e.name==='日經 225')e.futureCode='Nikkei 225 mini';if(e.name==='東證 TOPIX')e.futureCode='mini-TOPIX'}
for(const c of data.commodities||[]){if(c.name==='黃金')c.futureCode='MGC';if(c.name==='WTI 原油')c.futureCode='MCL'}
await fs.writeFile('data/latest.json',JSON.stringify(data,null,2)+'\n');

index=index.replaceAll('台灣指數：MTX / TMF','台灣指數：TX / MTX');
index=index.replaceAll('TAIEX 小型 / 微型','臺指期 TX / 小型臺指 MTX');
index=index.replace('選擇商品後，自動帶入交易所官方合約乘數、幣別、最小跳動點與到期週期；','選擇商品後，自動帶入交易所合約乘數、幣別、最小跳動點、原始保證金與到期週期；');
await fs.writeFile('index.html',index);

await fs.writeFile(appPath,app);

// ---- Provider: TAIFEX official daily + optional normalized licensed LIVE gateway for CME/JPX/ICE ----
const providers=`window.MarketProviders = (() => {
  const cfg=()=>window.MARKET_MONITOR_CONFIG||{mode:'local-json',endpoint:'./data/latest.json',refreshMs:15000,demoSimulation:false,liveEndpoint:''};
  async function fetchJson(url,required=true){if(!url)return null;try{const r=await fetch(url+(url.includes('?')?'&':'?')+'t='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}catch(e){if(required)throw e;console.warn('Optional market data unavailable:',url,e);return null}}
  function applyContracts(leg,p,source,mode){if(!p?.contracts?.length)return;const contracts=p.contracts.map(c=>({month:c.month,date:c.date||null,session:c.session||null,bid:c.bid??null,ask:c.ask??null,last:c.last??null,settlement:c.settlement??null,volume:c.volume??null,openInterest:c.openInterest??null,timestamp:c.timestamp||null}));const selected=contracts.find(c=>c.month===p.defaultMonth)||contracts[0];leg.contracts=contracts;leg.actualMonths=contracts.map(c=>c.month);leg.expiry=selected?.month||leg.expiry;if(selected?.bid!=null)leg.bid=selected.bid;if(selected?.ask!=null)leg.ask=selected.ask;if(selected?.last!=null)leg.last=selected.last;leg.quoteDate=selected?.date||null;leg.quoteSession=selected?.session||null;leg.quoteTimestamp=selected?.timestamp||null;leg.source=source;leg.quoteMode=mode}
  function mergeTaifex(data,official){if(!official?.products||!Array.isArray(data?.crossMarketCatalog))return data;data.taifexMeta=official.meta||null;for(const row of data.crossMarketCatalog){const a=official.products[row?.tw?.code];if(a)applyContracts(row.tw,a,'TAIFEX OpenAPI','OFFICIAL DAILY');if(String(row?.os?.exchange||'').includes('TAIFEX')){const b=official.products[row?.os?.code];if(b)applyContracts(row.os,b,'TAIFEX OpenAPI','OFFICIAL DAILY')}}return data}
  function mergeLive(data,live){if(!live?.quotes||!Array.isArray(data?.crossMarketCatalog))return data;data.liveMeta=live.meta||null;for(const row of data.crossMarketCatalog){for(const leg of [row.tw,row.os]){if(!leg||String(leg.exchange||'').includes('TAIFEX'))continue;const p=live.quotes[leg.id]||live.quotes[leg.code];if(p)applyContracts(leg,p,p.source||leg.exchange||'Licensed feed','LIVE')}}return data}
  async function load(){const c=cfg(),endpoint=c.endpoint||'./data/latest.json';const [base,taifex,live]=await Promise.all([fetchJson(endpoint,true),fetchJson('./data/taifex-latest.json',false),fetchJson(c.liveEndpoint,false)]);mergeTaifex(base,taifex);mergeLive(base,live);return base}
  function simulate(data){if(!cfg().demoSimulation)return data;const copy=structuredClone(data),j=(v,s=.0006)=>v*(1+(Math.random()-.5)*s);copy.asOf=new Date().toISOString();copy.top.forEach(x=>x.value=j(x.value));return copy}
  return {load,simulate};
})();
`;
await fs.writeFile('providers.js',providers);
await fs.writeFile('config.example.js',`window.MARKET_MONITOR_CONFIG = {\n  mode: 'local-json',\n  endpoint: './data/latest.json',\n  refreshMs: 15000,\n  demoSimulation: false,\n  liveEndpoint: '' // Licensed backend gateway for CME / JPX / ICE; never put exchange API keys in GitHub Pages\n};\n`);

await import('./fetch-taifex.mjs');
console.log('Installed TX/MTX comparison, initial margins, TAIFEX official data and licensed overseas LIVE gateway.');
