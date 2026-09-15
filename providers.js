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
