window.MarketProviders = (() => {
  const cfg = () => window.MARKET_MONITOR_CONFIG || {mode:'local-json',endpoint:'./data/latest.json',refreshMs:15000,demoSimulation:true};

  async function load() {
    const c = cfg();
    const endpoint = c.endpoint || './data/latest.json';
    const r = await fetch(endpoint + (endpoint.includes('?') ? '&' : '?') + 't=' + Date.now(), {cache:'no-store'});
    if (!r.ok) throw new Error('Market data HTTP ' + r.status);
    return r.json();
  }

  function simulate(data) {
    if (!cfg().demoSimulation) return data;
    const copy = structuredClone(data);
    copy.asOf = new Date().toISOString();
    const jitter = (v, scale=0.0006) => v * (1 + (Math.random()-0.5)*scale);
    copy.top.forEach(x => { x.value = jitter(x.value); });
    copy.equities.forEach(x => { x.cash=jitter(x.cash); x.future=jitter(x.future); x.basis=x.future-x.cash; });
    copy.commodities.forEach(x => { x.spot=jitter(x.spot,0.001); x.future=jitter(x.future,0.001); x.basis=x.future-x.spot; });
    if (copy.series) Object.keys(copy.series).forEach(k => {
      const s = copy.series[k];
      const last = s[s.length-1];
      s.push(jitter(last,0.001));
      if (s.length > 36) s.shift();
    });
    return copy;
  }

  return {load, simulate};
})();
