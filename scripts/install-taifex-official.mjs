import fs from 'node:fs/promises';

const appPath='app.js';
let app=await fs.readFile(appPath,'utf8');
let index=await fs.readFile('index.html','utf8');
const data=JSON.parse(await fs.readFile('data/latest.json','utf8'));

function replaceIfPresent(text,from,to){return text.includes(from)?text.replace(from,to):text}

app=replaceIfPresent(app,
"const DISPLAY_DECIMALS={SPF:2,ES:2,UNF:0,NQ:2,UDF:0,YM:0,SXF:1,SOX:1,TJF:1,TOPIX:1,F1F:1,Z:1,RHF:4,CNH:4,XEF:4,'6E':4,XJF:2,'6J':6,XBF:4,'6B':4,XAF:4,'6A':4,GDF:1,GC:1,TGF:0,BRF:2,BRENT:2};",
"const DISPLAY_DECIMALS={TX:0,MTX:0,TMF:0,SPF:2,MES:2,ES:2,UNF:0,MNQ:2,NQ:2,UDF:0,MYM:0,YM:0,SXF:1,SOX:1,TJF:1,'mini-TOPIX':2,TOPIX:1,F1F:1,Z:1,RHF:4,CNH:4,XEF:4,'6E':4,XJF:2,'6J':6,XBF:4,'6B':4,XAF:4,'6A':4,GDF:1,MGC:1,GC:1,TGF:0,BRF:2,IMM:3,BRENT:2};"
);

if(!app.includes("TAIFEX_MTX:{code:'MTX'")){
  app=app.replace("const CONTRACT_SPECS={\n",
`const CONTRACT_SPECS={\n  TAIFEX_TX:{code:'TX',multiplier:200,tick:1,currency:'TWD',cycle:'monthly6',label:'TAIEX Futures',note:'TWD 200 / index point'},\n  TAIFEX_MTX:{code:'MTX',multiplier:50,tick:1,currency:'TWD',cycle:'monthly6',label:'Mini-TAIEX Futures',note:'TWD 50 / index point'},\n  TAIFEX_TMF:{code:'TMF',multiplier:10,tick:1,currency:'TWD',cycle:'monthly6',label:'Micro TAIEX Futures',note:'TWD 10 / index point'},\n`);
}
app=replaceIfPresent(app,
"  CME_ES:{code:'ES',multiplier:50,tick:0.25,currency:'USD',cycle:'quarter8',label:'E-mini S&P 500',note:'USD 50 / index point'},",
"  CME_MES:{code:'MES',multiplier:5,tick:0.25,currency:'USD',cycle:'quarter8',label:'Micro E-mini S&P 500',note:'USD 5 / index point'},"
);
app=replaceIfPresent(app,
"  CME_NQ:{code:'NQ',multiplier:20,tick:0.25,currency:'USD',cycle:'quarter8',label:'E-mini Nasdaq-100',note:'USD 20 / index point'},",
"  CME_MNQ:{code:'MNQ',multiplier:2,tick:0.25,currency:'USD',cycle:'quarter8',label:'Micro E-mini Nasdaq-100',note:'USD 2 / index point'},"
);
app=replaceIfPresent(app,
"  CBOT_YM:{code:'YM',multiplier:5,tick:1,currency:'USD',cycle:'quarter8',label:'E-mini Dow',note:'USD 5 / index point'},",
"  CBOT_MYM:{code:'MYM',multiplier:0.5,tick:1,currency:'USD',cycle:'quarter8',label:'Micro E-mini Dow',note:'USD 0.50 / index point'},"
);
app=replaceIfPresent(app,
"  JPX_TOPIX:{code:'TOPIX',multiplier:10000,tick:0.5,currency:'JPY',cycle:'quarter12',label:'TOPIX',note:'JPY 10,000 / index point'},",
"  JPX_MINI_TOPIX:{code:'mini-TOPIX',multiplier:1000,tick:0.25,currency:'JPY',cycle:'quarter12',label:'mini-TOPIX',note:'JPY 1,000 / index point'},\n  JPX_NIKKEI225_MINI:{code:'Nikkei 225 mini',multiplier:100,tick:5,currency:'JPY',cycle:'monthly18',label:'Nikkei 225 mini',note:'JPY 100 / index point'},"
);
app=replaceIfPresent(app,
"  COMEX_GC:{code:'GC',multiplier:100,tick:0.1,currency:'USD',cycle:'gold12',label:'COMEX Gold',note:'100 troy oz'},",
"  COMEX_MGC:{code:'MGC',multiplier:10,tick:0.1,currency:'USD',cycle:'gold12',label:'Micro Gold',note:'10 troy oz'},"
);
app=replaceIfPresent(app,
"  COMEX_GC_TWD:{code:'GC',multiplier:100,tick:0.1,currency:'USD',cycle:'gold12',label:'COMEX Gold + FX',note:'100 troy oz'},",
"  COMEX_MGC_TWD:{code:'MGC',multiplier:10,tick:0.1,currency:'USD',cycle:'gold12',label:'Micro Gold + FX',note:'10 troy oz'},"
);
app=replaceIfPresent(app,
"  ICE_BRENT:{code:'BRENT',multiplier:1000,tick:0.01,currency:'USD',cycle:'monthly18',label:'ICE Brent',note:'1,000 barrels'}",
"  ICE_BRENT_MINI:{code:'IMM',multiplier:100,tick:0.001,currency:'USD',cycle:'monthly18',label:'Brent 1st Line Mini',note:'100 barrels'}"
);

app=app.replace(/\^TAIFEX_\(SPF\|UNF\|UDF\|SXF\|F1F\)\$/g,'^TAIFEX_(TX|MTX|TMF|SPF|UNF|UDF|SXF|F1F)$');
app=app.replace(/\^\(CME_ES\|CME_NQ\|CBOT_YM\|CME_SOX\|ICE_Z\)\$/g,'^(CME_MES|CME_MNQ|CBOT_MYM|CME_SOX|ICE_Z)$');
app=app.replace("if(id==='JPX_TOPIX')return nthWeekday(y,m,5,2);","if(['JPX_TOPIX','JPX_MINI_TOPIX'].includes(id))return nthWeekday(y,m,5,2);");

app=replaceIfPresent(app,
'<td><b>${x.tw.code}</b><div class="source-note">${x.tw.exchange}${x.tw.source?` · ${x.tw.source}`:\'\'}${x.tw.expiry?` · ${monthLabel(x.tw.expiry)}`:\'\'}</div></td>',
'<td><b>${x.tw.code}</b><div class="source-note">${x.tw.expiry?monthLabel(x.tw.expiry):\'—\'}</div></td>'
);
app=app.replaceAll('TAIFEX × Overseas','跨市場 / 同標的');

const rows=data.crossMarketCatalog||[];
const byName=name=>rows.find(r=>r.name===name);
function setOs(name,id,code,exchange){const r=byName(name);if(r){r.os.id=id;r.os.code=code;r.os.exchange=exchange;}}
setOs('S&P 500','CME_MES','MES','CME');
setOs('Nasdaq-100','CME_MNQ','MNQ','CME');
setOs('Dow Jones','CBOT_MYM','MYM','CBOT/CME');
setOs('TOPIX','JPX_MINI_TOPIX','mini-TOPIX','JPX/OSE');
setOs('黃金（美元計價）','COMEX_MGC','MGC','COMEX/CME');
setOs('黃金（新台幣計價）','COMEX_MGC_TWD','MGC + USD/TWD','COMEX/CME + FX');
setOs('Brent 原油','ICE_BRENT_MINI','IMM','ICE Futures Europe');

if(!rows.some(r=>r?.tw?.code==='MTX')){
  rows.unshift({
    category:'台灣指數',name:'TAIEX 小型 / 微型',underlying:'TAIEX',
    tw:{id:'TAIFEX_MTX',code:'MTX',exchange:'TAIFEX',bid:0,ask:0,last:0},
    os:{id:'TAIFEX_TMF',code:'TMF',exchange:'TAIFEX',bid:0,ask:0,last:0},
    compare:'direct'
  });
}
for(const e of data.equities||[]){
  if(e.name==='S&P 500')e.futureCode='MES';
  if(e.name==='Nasdaq-100')e.futureCode='MNQ';
  if(e.name==='日經 225')e.futureCode='Nikkei 225 mini';
  if(e.name==='東證 TOPIX')e.futureCode='mini-TOPIX';
}
for(const c of data.commodities||[]){
  if(c.name==='黃金')c.futureCode='MGC';
  if(c.name==='WTI 原油')c.futureCode='MCL';
}
await fs.writeFile('data/latest.json',JSON.stringify(data,null,2)+'\n');

index=index.replaceAll('TAIFEX × Overseas','跨市場 / 同標的');
index=index.replaceAll('CME_ES','CME_MES').replaceAll('CME_NQ','CME_MNQ').replaceAll('COMEX_GC','COMEX_MGC');
index=index.replace('股價指數：TJF / UDF / SPF / UNF / SXF / F1F','台灣指數：MTX / TMF　｜　股價指數：TJF / UDF / SPF / UNF / SXF / F1F');
await fs.writeFile('index.html',index);

await fs.writeFile(appPath,app);

const providers=`window.MarketProviders = (() => {
  const cfg = () => window.MARKET_MONITOR_CONFIG || {mode:'local-json',endpoint:'./data/latest.json',refreshMs:15000,demoSimulation:false};
  async function fetchJson(url, required=true) {
    try {
      const r = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), {cache:'no-store'});
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      if (required) throw e;
      console.warn('Optional market data unavailable:', url, e);
      return null;
    }
  }
  function mergeLeg(leg, official) {
    const p = official?.products?.[leg?.code];
    if (!p?.contracts?.length) return;
    const contracts = p.contracts.map(c => ({month:c.month,date:c.date,session:c.session,bid:c.bid,ask:c.ask,last:c.last,settlement:c.settlement,volume:c.volume,openInterest:c.openInterest}));
    const selected = contracts.find(c => c.month === p.defaultMonth) || contracts[0];
    leg.contracts = contracts;
    leg.actualMonths = contracts.map(c => c.month);
    leg.expiry = selected?.month || leg.expiry;
    if (selected?.bid != null) leg.bid = selected.bid;
    if (selected?.ask != null) leg.ask = selected.ask;
    if (selected?.last != null) leg.last = selected.last;
    leg.quoteDate = selected?.date || null;
    leg.quoteSession = selected?.session || null;
    leg.source = 'TAIFEX OpenAPI';
    leg.quoteMode = 'OFFICIAL DAILY';
  }
  function mergeTaifex(data, official) {
    if (!official?.products || !Array.isArray(data?.crossMarketCatalog)) return data;
    data.taifexMeta = official.meta || null;
    for (const row of data.crossMarketCatalog) {
      mergeLeg(row.tw,official);
      if (String(row?.os?.exchange||'').includes('TAIFEX')) mergeLeg(row.os,official);
    }
    return data;
  }
  async function load() {
    const c = cfg();
    const endpoint = c.endpoint || './data/latest.json';
    const [base, taifex] = await Promise.all([fetchJson(endpoint,true),fetchJson('./data/taifex-latest.json',false)]);
    return mergeTaifex(base,taifex);
  }
  function simulate(data) {
    if (!cfg().demoSimulation) return data;
    const copy = structuredClone(data);
    copy.asOf = new Date().toISOString();
    const jitter = (v, scale=0.0006) => v * (1 + (Math.random()-0.5)*scale);
    copy.top.forEach(x => { x.value = jitter(x.value); });
    copy.equities.forEach(x => { x.cash=jitter(x.cash); x.future=jitter(x.future); x.basis=x.future-x.cash; });
    copy.commodities.forEach(x => { x.spot=jitter(x.spot,0.001); x.future=jitter(x.future,0.001); x.basis=x.future-x.spot; });
    if (copy.series) Object.keys(copy.series).forEach(k => { const s=copy.series[k],last=s[s.length-1];s.push(jitter(last,0.001));if(s.length>36)s.shift(); });
    return copy;
  }
  return {load,simulate};
})();
`;
await fs.writeFile('providers.js',providers);
await fs.writeFile('config.example.js',`window.MARKET_MONITOR_CONFIG = {\n  mode: 'local-json',\n  endpoint: './data/latest.json',\n  refreshMs: 15000,\n  demoSimulation: false\n};\n`);

await import('./fetch-taifex.mjs');
console.log('TAIFEX official data integration installed with smaller overseas contract defaults.');
