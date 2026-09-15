import fs from 'node:fs/promises';

const appPath='app.js';
let app=await fs.readFile(appPath,'utf8');

function replaceOnce(from,to,label){
  if(app.includes(to)) return;
  if(!app.includes(from)) throw new Error(`Patch target not found: ${label}`);
  app=app.replace(from,to);
}

replaceOnce(
  "function contractMonths(id){const c=CONTRACT_SPECS[id]?.cycle||'';",
  "function contractMonths(id){const actual=catalogRows().find(r=>r?.tw?.id===id)?.tw?.actualMonths;if(Array.isArray(actual)&&actual.length)return actual;const c=CONTRACT_SPECS[id]?.cycle||'';",
  'actual TAIFEX contract months'
);
replaceOnce(
  "function costFieldValue(q,field){return Number(q?.[String(field).toLowerCase()]??0)}",
  "function costFieldValue(q,field,month){const key=String(field).toLowerCase();if(month&&Array.isArray(q?.contracts)){const c=q.contracts.find(x=>x.month===month);if(c&&c[key]!=null)return Number(c[key])}return Number(q?.[key]??0)}",
  'month-aware quote lookup'
);
replaceOnce(
  "twP=costFieldValue(row.tw,twField),osP=costFieldValue(row.os,osField),",
  "twP=costFieldValue(row.tw,twField,$('#twExpiry').value),osP=costFieldValue(row.os,osField,$('#osExpiry').value),",
  'cost lab selected month quote'
);
replaceOnce(
  '<td><b>${x.tw.code}</b><div class="source-note">${x.tw.exchange}</div></td>',
  '<td><b>${x.tw.code}</b><div class="source-note">${x.tw.exchange}${x.tw.source?` · ${x.tw.source}`:\'\'}${x.tw.expiry?` · ${monthLabel(x.tw.expiry)}`:\'\'}</div></td>',
  'TAIFEX source label'
);
replaceOnce(
  "async function refresh(){try{$('#feedStatus').textContent='更新中';const raw=await MarketProviders.load();DATA=MarketProviders.simulate(raw);$('#feedStatus').textContent='資料已更新';render()}catch(e){console.error(e);$('#feedStatus').textContent='資料讀取失敗'}}",
  "async function refresh(){try{$('#feedStatus').textContent='更新中';const raw=await MarketProviders.load();DATA=MarketProviders.simulate(raw);const m=DATA?.taifexMeta;$('#feedStatus').textContent=m?.generatedAt?'TAIFEX 官方資料已更新':'資料已更新';render()}catch(e){console.error(e);$('#feedStatus').textContent='資料讀取失敗'}}",
  'feed status'
);
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
  function mergeTaifex(data, official) {
    if (!official?.products || !Array.isArray(data?.crossMarketCatalog)) return data;
    data.taifexMeta = official.meta || null;
    for (const row of data.crossMarketCatalog) {
      const p = official.products[row?.tw?.code];
      if (!p?.contracts?.length) continue;
      const contracts = p.contracts.map(c => ({month:c.month,date:c.date,session:c.session,bid:c.bid,ask:c.ask,last:c.last,settlement:c.settlement,volume:c.volume,openInterest:c.openInterest}));
      const selected = contracts.find(c => c.month === p.defaultMonth) || contracts[0];
      row.tw.contracts = contracts;
      row.tw.actualMonths = contracts.map(c => c.month);
      row.tw.expiry = selected?.month || row.tw.expiry;
      if (selected?.bid != null) row.tw.bid = selected.bid;
      if (selected?.ask != null) row.tw.ask = selected.ask;
      if (selected?.last != null) row.tw.last = selected.last;
      row.tw.quoteDate = selected?.date || null;
      row.tw.quoteSession = selected?.session || null;
      row.tw.source = 'TAIFEX OpenAPI';
      row.tw.quoteMode = 'OFFICIAL DAILY';
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
console.log('TAIFEX official data integration installed.');
