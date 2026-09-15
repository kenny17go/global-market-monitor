const URL = 'https://openapi.taifex.com.tw/v1/DailyMarketReportFut';
const TARGETS = ['SPF','UNF','UDF','SXF','TJF','F1F','RHF','XEF','XJF','XBF','XAF','GDF','TGF','BRF'];

const nullish = new Set(['','-','--','---','null','NULL','N/A']);
const text = v => (v == null ? '' : String(v).trim());
const num = v => {
  const s = text(v).replace(/,/g,'');
  if (nullish.has(s)) return null;
  const n = Number(s.replace(/[▲▼+%]/g,''));
  return Number.isFinite(n) ? n : null;
};
const get = (r, ...keys) => {
  for (const k of keys) if (Object.prototype.hasOwnProperty.call(r,k)) return r[k];
  return undefined;
};
const monthOf = r => text(get(r,'ContractMonth(Week)','ContractMonth','到期月份(週別)','到期月份')).replace(/\s/g,'');
const sessionOf = r => text(get(r,'TradingSession','交易時段'));
const dateOf = r => text(get(r,'Date','日期'));
const contractOf = r => text(get(r,'Contract','契約'));
const validMonth = m => /^\d{6}$/.test(m);

const now = new Date();
const taipeiHour = Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',hour:'2-digit',hour12:false}).format(now));
const preferredSession = taipeiHour < 8 ? '盤後' : '一般';

const res = await fetch(URL,{headers:{accept:'application/json','user-agent':'global-market-monitor/1.0'}});
if (!res.ok) throw new Error(`TAIFEX OpenAPI HTTP ${res.status}`);
const rows = await res.json();
if (!Array.isArray(rows)) throw new Error('Unexpected TAIFEX OpenAPI payload');

const products = {};
for (const code of TARGETS) {
  const src = rows.filter(r => contractOf(r) === code && validMonth(monthOf(r)));
  const byMonth = new Map();
  for (const r of src) {
    const month = monthOf(r), date = dateOf(r), session = sessionOf(r);
    const q = {
      month, date, session,
      bid: num(get(r,'BestBid','最後最佳買價')),
      ask: num(get(r,'BestAsk','最後最佳賣價')),
      last: num(get(r,'Last','最後成交價')),
      settlement: num(get(r,'SettlementPrice','結算價')),
      volume: num(get(r,'Volume','合計成交量','成交量')),
      openInterest: num(get(r,'OpenInterest','未沖銷契約數'))
    };
    if (!byMonth.has(month)) byMonth.set(month,[]);
    byMonth.get(month).push(q);
  }
  const contracts = [...byMonth.entries()].map(([month, list]) => {
    list.sort((a,b) => {
      const d = b.date.localeCompare(a.date); if (d) return d;
      const as = a.session.includes(preferredSession) ? 1 : 0;
      const bs = b.session.includes(preferredSession) ? 1 : 0;
      return bs-as;
    });
    const preferred = list.find(x => x.session.includes(preferredSession) && (x.last!=null || x.bid!=null || x.ask!=null))
      || list.find(x => x.last!=null || x.bid!=null || x.ask!=null)
      || list[0];
    return preferred;
  }).sort((a,b)=>a.month.localeCompare(b.month));

  const usable = contracts.filter(x => x.last!=null || x.bid!=null || x.ask!=null);
  const defaultContract = usable[0] || contracts[0] || null;
  products[code] = { defaultMonth: defaultContract?.month || null, contracts };
}

const out = {
  meta: {
    source: 'TAIFEX OpenAPI DailyMarketReportFut',
    sourceUrl: URL,
    mode: 'OFFICIAL_DAILY',
    realtime: false,
    preferredSession,
    generatedAt: new Date().toISOString(),
    note: 'Official TAIFEX open data. Latest daily/session snapshot; not a streaming real-time feed.'
  },
  products
};

const fs = await import('node:fs/promises');
await fs.mkdir('data',{recursive:true});
await fs.writeFile('data/taifex-latest.json', JSON.stringify(out,null,2)+'\n');
console.log(`Wrote data/taifex-latest.json for ${Object.keys(products).length} products`);
