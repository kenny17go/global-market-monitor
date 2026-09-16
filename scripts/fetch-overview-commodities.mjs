import fs from 'node:fs/promises';

const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36 global-market-monitor/1.0';
const num=v=>{if(v==null)return null;const n=Number(String(v).replace(/,/g,''));return Number.isFinite(n)?n:null};
const inRange=(v,[lo,hi])=>{const n=num(v);return n!=null&&n>=lo&&n<=hi?n:null};

async function fetchJson(url){const r=await fetch(url,{headers:{'user-agent':UA,'accept':'application/json,text/plain,*/*','accept-language':'en-US,en;q=0.9'},redirect:'follow'});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.json()}
async function fetchText(url){const r=await fetch(url,{headers:{'user-agent':UA,'accept':'text/csv,text/plain,*/*','accept-language':'en-US,en;q=0.9'},redirect:'follow'});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.text()}

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

async function fredLatest(series,label,range){
  try{
    const csv=await fetchText(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${series}`);
    const rows=csv.trim().split(/\r?\n/).slice(1).map(line=>line.split(',')).filter(x=>x.length>=2&&x[1]!=='.');
    const validRows=rows.map(([date,value])=>({date,value:inRange(value,range)})).filter(x=>x.value!=null);
    const a=validRows.at(-1),b=validRows.at(-2);if(!a)throw new Error('missing FRED observation');
    const change=b?a.value-b.value:null,pct=b&&b.value?change/b.value*100:null;
    return {label,series,last:a.value,previousClose:b?.value??null,change,pct,timestamp:`${a.date}T00:00:00Z`,source:'FRED / EIA daily spot',mode:'DAILY'};
  }catch(e){console.warn('FRED commodity spot failed',label,series,e.message);return {label,series,last:null,previousClose:null,change:null,pct:null,timestamp:null,source:'FRED / EIA daily spot',mode:'UNAVAILABLE'}}
}

const [goldSpot,silverSpot,wtiSpot,brentSpot,goldFuture,silverFuture,wtiFuture,brentFuture]=await Promise.all([
  yahooChart('XAUUSD=X',[100,10000],'Gold spot XAU/USD'),
  yahooChart('XAGUSD=X',[1,300],'Silver spot XAG/USD'),
  fredLatest('DCOILWTICO','WTI Cushing spot',[5,300]),
  fredLatest('DCOILBRENTEU','Brent Europe spot',[5,300]),
  yahooChart('MGC=F',[100,10000],'COMEX Micro Gold futures'),
  yahooChart('SI=F',[1,300],'COMEX Silver futures'),
  yahooChart('MCL=F',[5,300],'NYMEX Micro WTI futures'),
  yahooChart('BZ=F',[5,300],'Brent futures benchmark')
]);

const commodities={
  GOLD:{id:'GOLD',name:'黃金',spot:goldSpot,future:goldFuture,futureCode:'MGC'},
  SILVER:{id:'SILVER',name:'白銀',spot:silverSpot,future:silverFuture,futureCode:'SI'},
  WTI:{id:'WTI',name:'WTI 原油',spot:wtiSpot,future:wtiFuture,futureCode:'MCL'},
  BRENT:{id:'BRENT',name:'Brent 原油',spot:brentSpot,future:brentFuture,futureCode:'BRN'}
};
const out={meta:{source:'Yahoo Finance + FRED/EIA',mode:'MIXED DELAYED/DAILY',realtime:false,generatedAt:new Date().toISOString(),note:'Gold and silver spot plus commodity futures use public Yahoo delayed/web data when available. WTI and Brent spot use FRED/EIA daily spot series. Missing quotes remain null; no synthetic values are created.'},commodities};
await fs.mkdir('data',{recursive:true});
await fs.writeFile('data/commodities-latest.json',JSON.stringify(out,null,2)+'\n');
console.log('Wrote data/commodities-latest.json');
for(const [id,x] of Object.entries(commodities))console.log(id,'spot',x.spot.last,x.spot.source,'future',x.future.last,x.future.source);
