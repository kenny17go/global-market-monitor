import fs from 'node:fs/promises';

// Keep the overseas delayed fetcher capable of supplying cash indices, matching futures,
// and REAL intraday 1D / 5m series for the overview cards.
let f=await fs.readFile('scripts/fetch-overseas-delayed.mjs','utf8');
if(!f.includes("{id:'CME_SOX',root:'SOX'")){
  f=f.replace("  {id:'CBOT_MYM',root:'MYM',exchange:'CBOT/CME',range:[1000,100000]},", "  {id:'CBOT_MYM',root:'MYM',exchange:'CBOT/CME',range:[1000,100000]},\n  {id:'CME_SOX',root:'SOX',exchange:'CME',range:[100,20000]},");
}

const indexFn=`async function yahooIndexQuote(id,symbol,label,range){
  try{
    const j=await fetchJson(\`https://query1.finance.yahoo.com/v8/finance/chart/\${encodeURIComponent(symbol)}?interval=5m&range=1d\`);
    const r=j?.chart?.result?.[0],m=r?.meta;
    const last=valid(m?.regularMarketPrice,range),prev=valid(m?.chartPreviousClose??m?.previousClose,range);
    if(last==null)throw new Error('missing market price');
    const change=prev!=null?last-prev:null,pct=prev?change/prev*100:null;
    const ts=Array.isArray(r?.timestamp)?r.timestamp:[];
    const close=Array.isArray(r?.indicators?.quote?.[0]?.close)?r.indicators.quote[0].close:[];
    const points=[];
    for(let i=0;i<Math.min(ts.length,close.length);i++){
      const t=Number(ts[i]),v=valid(close[i],range);
      if(!Number.isFinite(t)||v==null)continue;
      points.push({t,v});
    }
    return {
      id,symbol,label,last,previousClose:prev,change,pct,
      timestamp:m?.regularMarketTime?new Date(m.regularMarketTime*1000).toISOString():new Date().toISOString(),
      source:'Yahoo Finance',mode:'DELAYED',
      series:points.map(x=>x.v),
      seriesTimes:points.map(x=>new Date(x.t*1000).toISOString()),
      seriesMeta:{range:'1D',interval:'5m',session:'LATEST_SESSION',source:'Yahoo Finance',mode:'DELAYED',timezone:m?.exchangeTimezoneName||null,points:points.length}
    };
  }catch(e){
    console.warn('Yahoo index failed',id,symbol,e.message);
    return {id,symbol,label,last:null,previousClose:null,change:null,pct:null,timestamp:null,source:'Yahoo Finance',mode:'UNAVAILABLE',series:[],seriesTimes:[],seriesMeta:{range:'1D',interval:'5m',session:'LATEST_SESSION',source:'Yahoo Finance',mode:'UNAVAILABLE',points:0}};
  }
}`;
if(/async function yahooIndexQuote\([^]*?\n}\n\nasync function tradingViewContracts/.test(f)){
  f=f.replace(/async function yahooIndexQuote\([^]*?\n}\n\nasync function tradingViewContracts/,indexFn+'\n\nasync function tradingViewContracts');
}else if(!f.includes('async function yahooIndexQuote(')){
  f=f.replace('\nasync function tradingViewContracts(', '\n'+indexFn+'\n\nasync function tradingViewContracts(');
}

if(!f.includes('const INDEX_TARGETS=')){
  const block=`\nconst INDEX_TARGETS=[\n  {id:'SPX',symbol:'^GSPC',label:'S&P 500',range:[100,20000]},\n  {id:'NDX',symbol:'^NDX',label:'Nasdaq-100',range:[1000,100000]},\n  {id:'SOX',symbol:'^SOX',label:'SOX 費半',range:[100,20000]},\n  {id:'TAIEX',symbol:'^TWII',label:'台灣加權',range:[1000,100000]},\n  {id:'NIKKEI',symbol:'^N225',label:'日經 225',range:[1000,100000]},\n  {id:'TOPIX',symbol:'^TOPX',label:'東證 TOPIX',range:[100,10000]}\n];\nconst indices={};\nfor(const x of INDEX_TARGETS)indices[x.id]=await yahooIndexQuote(x.id,x.symbol,x.label,x.range);\n`;
  f=f.replace('\nconst products={};for(const t of ROOTS)products[t.id]=await yahooRootProduct(t);',block+'\nconst products={};for(const t of ROOTS)products[t.id]=await yahooRootProduct(t);');
}

f=f.replace("const out={meta:{source:'Yahoo Finance + JPX delayed fallbacks',mode:'DELAYED',realtime:false,generatedAt:new Date().toISOString(),note:'Yahoo Bid/Ask uses cookie/crumb quote sessions when available; Last falls back to Yahoo chart data. JPX/OSE fallbacks expose delayed last prices/contract months only and do not synthesize Bid/Ask. Sanity ranges reject obviously wrong values. LIVE broker connectors can override delayed data.'},products};",
"const out={meta:{source:'Yahoo Finance + JPX delayed fallbacks',mode:'DELAYED',realtime:false,generatedAt:new Date().toISOString(),note:'Yahoo cash indices and futures are public delayed/web data, not a licensed realtime feed. Overview spark lines use Yahoo 1D / 5m latest-session chart points when available; no synthetic path is generated. Yahoo Bid/Ask uses cookie/crumb quote sessions when available; Last falls back to Yahoo chart data. JPX/OSE fallbacks expose delayed last prices/contract months only and do not synthesize Bid/Ask. Sanity ranges reject obviously wrong values. LIVE broker connectors can override delayed data.'},indices,products};");

if(!f.includes('seriesMeta:{range:\'1D\',interval:\'5m\''))throw new Error('real intraday index series patch failed');
if(!f.includes('indices,products'))throw new Error('overview index data patch failed');
await fs.writeFile('scripts/fetch-overseas-delayed.mjs',f);

// Merge cash indices + matching futures + intraday series into the Overview equity table.
let p=await fs.readFile('providers.js','utf8');
const mergeFn="function mergeOverviewEquities(data,d,t){if(!Array.isArray(data?.equities))return data;data.equityOverviewMeta=d?.meta||null;data.series=data.series||{};data.seriesTimes=data.seriesTimes||{};data.seriesMeta=data.seriesMeta||{};const maps={'S&P 500':{idx:'SPX',fut:'CME_MES'},'Nasdaq-100':{idx:'NDX',fut:'CME_MNQ'},'SOX 費半':{idx:'SOX',fut:'CME_SOX'},'台灣加權':{idx:'TAIEX',taifex:'TX'},'日經 225':{idx:'NIKKEI',fut:'JPX_NIKKEI225_MINI'},'東證 TOPIX':{idx:'TOPIX',fut:'JPX_MINI_TOPIX'}};const pick=p=>{if(!p?.contracts?.length)return null;return p.contracts.find(c=>c.month===p.defaultMonth)||p.contracts[0]};for(const row of data.equities){const m=maps[row.name];if(!m)continue;const q=d?.indices?.[m.idx];if(q?.last!=null){row.cash=q.last;row.pct=q.pct??null;row.cashSource=q.source||'Yahoo Finance';row.cashQuoteMode=q.mode||'DELAYED';row.cashTimestamp=q.timestamp||null;const top=Array.isArray(data.top)?data.top.find(x=>x.id===m.idx):null;if(top){top.value=q.last;top.change=q.change??0;top.pct=q.pct??null}}if(Array.isArray(q?.series)&&q.series.length>=2){data.series[m.idx]=q.series;data.seriesTimes[m.idx]=Array.isArray(q.seriesTimes)?q.seriesTimes:[];data.seriesMeta[m.idx]=q.seriesMeta||{range:'1D',interval:'5m',session:'LATEST_SESSION',source:q.source||'Yahoo Finance',mode:q.mode||'DELAYED',points:q.series.length}}else if(Array.isArray(data.series?.[m.idx])&&data.series[m.idx].length>=2){data.seriesMeta[m.idx]={...(data.seriesMeta?.[m.idx]||{}),range:data.seriesMeta?.[m.idx]?.range||'1D',interval:data.seriesMeta?.[m.idx]?.interval||'reference',source:data.seriesMeta?.[m.idx]?.source||'Cached reference series',mode:'REFERENCE',points:data.series[m.idx].length}}let c=null,source=null,mode=null;if(m.fut){const fp=d?.products?.[m.fut];c=pick(fp);source=fp?.source||null;mode=fp?.mode||null}else if(m.taifex){const fp=t?.products?.[m.taifex];c=pick(fp);source='TAIFEX OpenAPI';mode='OFFICIAL DAILY'}if(c){const fv=c.last??c.settlement??null;if(fv!=null){row.future=fv;row.basis=row.cash!=null?fv-row.cash:null;row.futureSource=source;row.futureQuoteMode=mode;row.futureTimestamp=c.timestamp||c.date||null}}}return data}";
if(/function mergeOverviewEquities\([^]*?return data\}/.test(p))p=p.replace(/function mergeOverviewEquities\([^]*?return data\}/,mergeFn);
else p=p.replace('function localLiveEndpoint(){',mergeFn+'function localLiveEndpoint(){');
if(!p.includes('mergeOverviewEquities(base,delayed,taifex);'))p=p.replace('mergeDelayed(base,delayed);','mergeDelayed(base,delayed);mergeOverviewEquities(base,delayed,taifex);');
if(!p.includes('data.seriesMeta[m.idx]'))throw new Error('overview intraday provider patch failed');
await fs.writeFile('providers.js',p);

// Overview cards: use ONLY genuine intraday points. Never draw a fabricated fallback path.
let app=await fs.readFile('app.js','utf8');
const renderTop=`function renderTopCards(){const u=topUniverse(),items=selectedTop.map(id=>u[id]).filter(Boolean);$('#topCards').innerHTML=items.map(x=>{const d=['USDTWD','USDJPY','EURUSD'].includes(x.id)?3:2,arr=Array.isArray(DATA.series?.[x.id])?DATA.series[x.id]:[],meta=DATA.seriesMeta?.[x.id]||null,hasSeries=arr.length>=2,tag=hasSeries?\`${'${meta?.range||\'1D\'}'} · ${'${meta?.interval||\'5m\'}'}\`:'';return \`<div class=\"card\"><div class=\"label\">${'${x.label}'}</div><div class=\"value\">${'${fmt(x.value,d)}'}</div><div class=\"${'${cls(x.pct||x.change)}'}\">${'${x.change>=0?\'+\':\'\'}'}${'${fmt(x.change||0,d)}'}　${'${x.pct!=null?`${x.pct>=0?\'+\':\'\'}${fmt(x.pct,2)}%`:\'\'}'}</div><div class=\"spark\">${'${hasSeries?sparkSvg(arr,(x.pct||x.change)>=0?\'#22df91\':\'#ff5b62\'):`<div class=\"spark-unavailable\">盤中線暫無資料</div>`}'}</div>${'${hasSeries?`<div class=\"spark-meta\">${tag} · ${meta?.mode||\'DELAYED\'}</div>`:\'\'}'}</div>\`}).join('')}`;
if(/function renderTopCards\(\)\{[^\n]*\}/.test(app))app=app.replace(/function renderTopCards\(\)\{[^\n]*\}/,renderTop);
if(!app.includes('盤中線暫無資料')||!app.includes('spark-meta'))throw new Error('overview real sparkline renderer patch failed');
await fs.writeFile('app.js',app);

let css=await fs.readFile('styles.css','utf8');
if(!css.includes('/* real-intraday-sparklines */')){
  css+='\n/* real-intraday-sparklines */\n.card .spark{position:relative}\n.spark-meta{margin-top:3px;text-align:right;font-size:10px;letter-spacing:.02em;color:#6f8799;line-height:1.2}\n.spark-unavailable{height:32px;display:flex;align-items:center;justify-content:center;border-top:1px dashed rgba(111,135,153,.22);font-size:10px;color:#607789}\n';
}
await fs.writeFile('styles.css',css);
console.log('Overview equity cash + futures + real 1D/5m intraday sparkline bridge installed.');
