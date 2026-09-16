import fs from 'node:fs/promises';

const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36 global-market-monitor/1.0';
const num=v=>{if(v==null)return null;const n=Number(String(v).replace(/,/g,''));return Number.isFinite(n)?n:null};
const inRange=(v,[lo,hi])=>{const n=num(v);return n!=null&&n>=lo&&n<=hi?n:null};

async function request(url,{accept='application/json,text/plain,*/*',timeout=15000}={}){const r=await fetch(url,{headers:{'user-agent':UA,accept,'accept-language':'en-US,en;q=0.9'},redirect:'follow',signal:AbortSignal.timeout(timeout)});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r}
async function fetchJson(url,opt={}){return await (await request(url,opt)).json()}
async function fetchText(url,opt={}){return await (await request(url,{accept:'text/csv,text/plain,*/*',...opt})).text()}

async function yahooChart(symbol,range,label){
  try{
    const j=await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`);
    const m=j?.chart?.result?.[0]?.meta;
    const last=inRange(m?.regularMarketPrice,range),prev=inRange(m?.chartPreviousClose??m?.previousClose,range);
    if(last==null)throw new Error('missing market price');
    const change=prev!=null?last-prev:null,pct=prev?change/prev*100:null;
    return {label,symbol,last,previousClose:prev,change,pct,timestamp:m?.regularMarketTime?new Date(m.regularMarketTime*1000).toISOString():new Date().toISOString(),source:'Yahoo Finance',mode:'DELAYED'};
  }catch(e){console.warn('Yahoo commodity quote failed',label,symbol,e.message);return {label,symbol,last:null,previousClose:null,change:null,pct:null,timestamp:null,source:'Yahoo Finance',mode:'UNAVAILABLE'}}
}

async function stooqQuote(symbols,range,label){
  for(const symbol of symbols){
    try{
      const csv=await fetchText(`https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv&h&e=csv`,{timeout:12000});
      const lines=csv.trim().split(/\r?\n/);if(lines.length<2)throw new Error('empty CSV');
      const headers=lines[0].split(',').map(x=>x.trim().toLowerCase()),vals=lines[1].split(',').map(x=>x.trim());
      const row=Object.fromEntries(headers.map((h,i)=>[h,vals[i]]));
      const last=inRange(row.close,range),open=inRange(row.open,range);if(last==null)throw new Error('missing close');
      const change=open!=null?last-open:null,pct=open?change/open*100:null;
      return {label,symbol,last,previousClose:null,change,pct,timestamp:row.date&&row.time?`${row.date}T${row.time}Z`:row.date?`${row.date}T00:00:00Z`:new Date().toISOString(),source:'Stooq public quote',mode:'DELAYED',changeBasis:'session open'};
    }catch(e){console.warn('Stooq commodity quote failed',label,symbol,e.message)}
  }
  return {label,symbol:symbols[0],last:null,previousClose:null,change:null,pct:null,timestamp:null,source:'Stooq public quote',mode:'UNAVAILABLE'};
}

async function fredLatest(series,label,range){
  try{
    const csv=await fetchText(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${series}`,{timeout:12000});
    const rows=csv.trim().split(/\r?\n/).slice(1).map(line=>line.split(',')).filter(x=>x.length>=2&&x[1]!=='.');
    const validRows=rows.map(([date,value])=>({date,value:inRange(value,range)})).filter(x=>x.value!=null);
    const a=validRows.at(-1),b=validRows.at(-2);if(!a)throw new Error('missing FRED observation');
    const change=b?a.value-b.value:null,pct=b&&b.value?change/b.value*100:null;
    return {label,series,last:a.value,previousClose:b?.value??null,change,pct,timestamp:`${a.date}T00:00:00Z`,source:'FRED / EIA daily spot',mode:'DAILY'};
  }catch(e){console.warn('FRED commodity spot failed',label,series,e.message);return {label,series,last:null,previousClose:null,change:null,pct:null,timestamp:null,source:'FRED / EIA daily spot',mode:'UNAVAILABLE'}}
}

async function fallbackSpot(stooqSymbols,fredSeries,label,range){const s=await stooqQuote(stooqSymbols,range,label);if(s.last!=null)return s;return fredSeries?await fredLatest(fredSeries,label,range):s}

const [goldSpot,silverSpot,wtiSpot,brentSpot,copperSpot,gasSpot,goldFuture,silverFuture,wtiFuture,brentFuture,copperFuture,gasFuture]=await Promise.all([
  stooqQuote(['xauusd'],[100,10000],'Gold spot XAU/USD'),
  stooqQuote(['xagusd'],[1,300],'Silver spot XAG/USD'),
  fallbackSpot(['cl.c','wti'],'DCOILWTICO','WTI Cushing spot',[5,300]),
  fallbackSpot(['brent.c','brn.c','brent'],'DCOILBRENTEU','Brent Europe spot',[5,300]),
  fallbackSpot(['copper','copper.usd'],null,'Copper spot reference',[1,20]),
  fallbackSpot(['naturalgas','natgas'], 'DHHNGSP','Henry Hub natural gas spot',[0.5,30]),
  yahooChart('MGC=F',[100,10000],'COMEX Micro Gold futures'),
  yahooChart('SI=F',[1,300],'COMEX Silver futures'),
  yahooChart('MCL=F',[5,300],'NYMEX Micro WTI futures'),
  yahooChart('BZ=F',[5,300],'Brent futures benchmark'),
  yahooChart('HG=F',[1,20],'COMEX Copper futures'),
  yahooChart('NG=F',[0.5,30],'NYMEX Natural Gas futures')
]);

const commodities={
  GOLD:{id:'GOLD',name:'黃金',spot:goldSpot,future:goldFuture,futureCode:'MGC'},
  SILVER:{id:'SILVER',name:'白銀',spot:silverSpot,future:silverFuture,futureCode:'SI'},
  WTI:{id:'WTI',name:'WTI 原油',spot:wtiSpot,future:wtiFuture,futureCode:'MCL'},
  BRENT:{id:'BRENT',name:'Brent 原油',spot:brentSpot,future:brentFuture,futureCode:'BRN'},
  COPPER:{id:'COPPER',name:'銅',spot:copperSpot,future:copperFuture,futureCode:'HG'},
  NATGAS:{id:'NATGAS',name:'天然氣',spot:gasSpot,future:gasFuture,futureCode:'NG'}
};
const out={meta:{source:'Stooq + FRED/EIA + Yahoo Finance',mode:'MIXED DELAYED/DAILY',realtime:false,generatedAt:new Date().toISOString(),note:'Gold/silver and selected cash references use Stooq public quotes when available. Oil and natural-gas spot can fall back to FRED/EIA daily observations. Futures use Yahoo public delayed/web data. Copper spot is left unavailable if no comparable public cash quote is found; no futures quote is relabeled as spot and no synthetic values are created.'},commodities};
await fs.mkdir('data',{recursive:true});
await fs.writeFile('data/commodities-latest.json',JSON.stringify(out,null,2)+'\n');
console.log('Wrote data/commodities-latest.json');
for(const [id,x] of Object.entries(commodities))console.log(id,'spot',x.spot.last,x.spot.source,'future',x.future.last,x.future.source);
