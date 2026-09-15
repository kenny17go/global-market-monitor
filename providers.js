window.MarketProviders = (() => {
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
