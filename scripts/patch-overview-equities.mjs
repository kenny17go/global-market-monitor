import fs from 'node:fs/promises';

// Extend the existing overseas delayed fetcher with cash indices and SOX futures.
let f=await fs.readFile('scripts/fetch-overseas-delayed.mjs','utf8');
if(!f.includes("{id:'CME_SOX',root:'SOX'")){
  f=f.replace("  {id:'CBOT_MYM',root:'MYM',exchange:'CBOT/CME',range:[1000,100000]},", "  {id:'CBOT_MYM',root:'MYM',exchange:'CBOT/CME',range:[1000,100000]},\n  {id:'CME_SOX',root:'SOX',exchange:'CME',range:[100,20000]},");
}

if(!f.includes('async function yahooIndexQuote(')){
  const indexFn=`\nasync function yahooIndexQuote(id,symbol,label,range){\n  try{\n    const j=await fetchJson(\`https://query1.finance.yahoo.com/v8/finance/chart/\${encodeURIComponent(symbol)}?interval=1m&range=1d\`);\n    const m=j?.chart?.result?.[0]?.meta;\n    const last=valid(m?.regularMarketPrice,range),prev=valid(m?.chartPreviousClose??m?.previousClose,range);\n    if(last==null)throw new Error('missing market price');\n    const change=prev!=null?last-prev:null,pct=prev?change/prev*100:null;\n    return {id,symbol,label,last,previousClose:prev,change,pct,timestamp:m?.regularMarketTime?new Date(m.regularMarketTime*1000).toISOString():new Date().toISOString(),source:'Yahoo Finance',mode:'DELAYED'};\n  }catch(e){console.warn('Yahoo index failed',id,symbol,e.message);return {id,symbol,label,last:null,previousClose:null,change:null,pct:null,timestamp:null,source:'Yahoo Finance',mode:'UNAVAILABLE'}}\n}\n`;
  f=f.replace('\nasync function tradingViewContracts(',indexFn+'\nasync function tradingViewContracts(');
}

if(!f.includes('const INDEX_TARGETS=')){
  const block=`\nconst INDEX_TARGETS=[\n  {id:'SPX',symbol:'^GSPC',label:'S&P 500',range:[100,20000]},\n  {id:'NDX',symbol:'^NDX',label:'Nasdaq-100',range:[1000,100000]},\n  {id:'SOX',symbol:'^SOX',label:'SOX 費半',range:[100,20000]},\n  {id:'TAIEX',symbol:'^TWII',label:'台灣加權',range:[1000,100000]},\n  {id:'NIKKEI',symbol:'^N225',label:'日經 225',range:[1000,100000]},\n  {id:'TOPIX',symbol:'^TOPX',label:'東證 TOPIX',range:[100,10000]}\n];\nconst indices={};\nfor(const x of INDEX_TARGETS)indices[x.id]=await yahooIndexQuote(x.id,x.symbol,x.label,x.range);\n`;
  f=f.replace('\nconst products={};for(const t of ROOTS)products[t.id]=await yahooRootProduct(t);',block+'\nconst products={};for(const t of ROOTS)products[t.id]=await yahooRootProduct(t);');
}

f=f.replace("const out={meta:{source:'Yahoo Finance + JPX delayed fallbacks',mode:'DELAYED',realtime:false,generatedAt:new Date().toISOString(),note:'Yahoo Bid/Ask uses cookie/crumb quote sessions when available; Last falls back to Yahoo chart data. JPX/OSE fallbacks expose delayed last prices/contract months only and do not synthesize Bid/Ask. Sanity ranges reject obviously wrong values. LIVE broker connectors can override delayed data.'},products};",
"const out={meta:{source:'Yahoo Finance + JPX delayed fallbacks',mode:'DELAYED',realtime:false,generatedAt:new Date().toISOString(),note:'Yahoo cash indices and futures are public delayed/web data, not a licensed realtime feed. Yahoo Bid/Ask uses cookie/crumb quote sessions when available; Last falls back to Yahoo chart data. JPX/OSE fallbacks expose delayed last prices/contract months only and do not synthesize Bid/Ask. Sanity ranges reject obviously wrong values. LIVE broker connectors can override delayed data.'},indices,products};");

if(!f.includes('indices,products'))throw new Error('overview index data patch failed');
await fs.writeFile('scripts/fetch-overseas-delayed.mjs',f);

// Merge cash indices + matching futures into the Overview equity table.
let p=await fs.readFile('providers.js','utf8');
const mergeFn="function mergeOverviewEquities(data,d,t){if(!Array.isArray(data?.equities))return data;data.equityOverviewMeta=d?.meta||null;const maps={'S&P 500':{idx:'SPX',fut:'CME_MES'},'Nasdaq-100':{idx:'NDX',fut:'CME_MNQ'},'SOX 費半':{idx:'SOX',fut:'CME_SOX'},'台灣加權':{idx:'TAIEX',taifex:'TX'},'日經 225':{idx:'NIKKEI',fut:'JPX_NIKKEI225_MINI'},'東證 TOPIX':{idx:'TOPIX',fut:'JPX_MINI_TOPIX'}};const pick=p=>{if(!p?.contracts?.length)return null;return p.contracts.find(c=>c.month===p.defaultMonth)||p.contracts[0]};for(const row of data.equities){const m=maps[row.name];if(!m)continue;const q=d?.indices?.[m.idx];if(q?.last!=null){row.cash=q.last;row.pct=q.pct??null;row.cashSource=q.source||'Yahoo Finance';row.cashQuoteMode=q.mode||'DELAYED';row.cashTimestamp=q.timestamp||null;const top=Array.isArray(data.top)?data.top.find(x=>x.id===m.idx):null;if(top){top.value=q.last;top.change=q.change??0;top.pct=q.pct??null}}let c=null,source=null,mode=null;if(m.fut){const fp=d?.products?.[m.fut];c=pick(fp);source=fp?.source||null;mode=fp?.mode||null}else if(m.taifex){const fp=t?.products?.[m.taifex];c=pick(fp);source='TAIFEX OpenAPI';mode='OFFICIAL DAILY'}if(c){const fv=c.last??c.settlement??null;if(fv!=null){row.future=fv;row.basis=row.cash!=null?fv-row.cash:null;row.futureSource=source;row.futureQuoteMode=mode;row.futureTimestamp=c.timestamp||c.date||null}}}return data}";
if(!p.includes('function mergeOverviewEquities('))p=p.replace('function localLiveEndpoint(){',mergeFn+'function localLiveEndpoint(){');
if(!p.includes('mergeOverviewEquities(base,delayed,taifex);'))p=p.replace('mergeDelayed(base,delayed);','mergeDelayed(base,delayed);mergeOverviewEquities(base,delayed,taifex);');
if(!p.includes('mergeOverviewEquities(base,delayed,taifex);'))throw new Error('overview equity provider patch failed');
await fs.writeFile('providers.js',p);
console.log('Overview equity cash + futures bridge installed.');
