import fs from 'node:fs/promises';

const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36 global-market-monitor/1.0';
const num=v=>{if(v==null)return null;const n=Number(String(v).replace(/,/g,''));return Number.isFinite(n)?n:null};
const inRange=(v,[lo,hi])=>{const n=num(v);return n!=null&&n>=lo&&n<=hi?n:null};

async function request(url,{accept='application/json,text/plain,*/*',timeout=15000}={}){const r=await fetch(url,{headers:{'user-agent':UA,accept,'accept-language':'en-US,en;q=0.9'},redirect:'follow',signal:AbortSignal.timeout(timeout)});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r}
async function fetchJson(url,opt={}){return await (await request(url,opt)).json()}
async function fetchText(url,opt={}){return await (await request(url,{accept:'text/csv,text/plain,*/*',...opt})).text()}

function localDateKey(sec,timeZone){try{return new Intl.DateTimeFormat('en-CA',{timeZone:timeZone||'UTC',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(sec*1000))}catch{return new Date(sec*1000).toISOString().slice(0,10)}}
async function yahooChart(symbol,range,label){
  try{
    const j=await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m&range=5d`);
    const r=j?.chart?.result?.[0],m=r?.meta;
    const last=inRange(m?.regularMarketPrice,range),prev=inRange(m?.chartPreviousClose??m?.previousClose,range);
    if(last==null)throw new Error('missing market price');
    const change=prev!=null?last-prev:null,pct=prev?change/prev*100:null;
    const ts=Array.isArray(r?.timestamp)?r.timestamp:[],close=Array.isArray(r?.indicators?.quote?.[0]?.close)?r.indicators.quote[0].close:[];
    const all=[];for(let i=0;i<Math.min(ts.length,close.length);i++){const t=Number(ts[i]),v=inRange(close[i],range);if(Number.isFinite(t)&&v!=null)all.push({t,v})}
    const tz=m?.exchangeTimezoneName||'UTC',groups=new Map();for(const x of all){const k=localDateKey(x.t,tz);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x)}
    const sessions=[...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0])),latest=sessions.at(-1),previous=sessions.at(-2),chosen=(latest?.[1]?.length>=24||!previous)?latest:previous,points=chosen?.[1]||[];
    return {label,symbol,last,previousClose:prev,change,pct,timestamp:m?.regularMarketTime?new Date(m.regularMarketTime*1000).toISOString():new Date().toISOString(),source:'Yahoo Finance',mode:'DELAYED',delayMinutes:10,series:points.map(x=>x.v),seriesTimes:points.map(x=>new Date(x.t*1000).toISOString()),seriesMeta:{range:'1D',interval:'5m',session:chosen?.[0]||'LATEST_SESSION',source:'Yahoo Finance',mode:'DELAYED',delayMinutes:10,timezone:tz,points:points.length,usedPreviousSession:chosen===previous,instrument:'FUTURES'}}
  }catch(e){console.warn('Yahoo commodity quote failed',label,symbol,e.message);return {label,symbol,last:null,previousClose:null,change:null,pct:null,timestamp:null,source:'Yahoo Finance',mode:'UNAVAILABLE',delayMinutes:null,series:[],seriesTimes:[],seriesMeta:{range:'1D',interval:'5m',source:'Yahoo Finance',mode:'UNAVAILABLE',points:0,instrument:'FUTURES'}}}
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
      return {label,symbol,last,previousClose:null,change,pct,timestamp:row.date&&row.time?`${row.date}T${row.time}Z`:row.date?`${row.date}T00:00:00Z`:new Date().toISOString(),source:'Stooq public quote',mode:'PUBLIC WEB QUOTE',delayMinutes:null,changeBasis:'session open'};
    }catch(e){console.warn('Stooq commodity quote failed',label,symbol,e.message)}
  }
  return {label,symbol:symbols[0],last:null,previousClose:null,change:null,pct:null,timestamp:null,source:'Stooq public quote',mode:'UNAVAILABLE',delayMinutes:null};
}

async function xausGoldSpot(){
  try{
    const j=await fetchJson('https://xaus.com/api/v1/spot',{timeout:12000});
    const last=inRange(j?.xau?.price??j?.spot_usd_oz,[100,10000]);if(last==null)throw new Error('missing XAU price');
    const timestamp=j?.data_state?.as_of||j?.updated_at||new Date().toISOString();
    const age=Number(j?.data_state?.age_seconds),stale=String(j?.data_state?.status||'').toLowerCase()==='stale'||(Number.isFinite(age)&&age>300);
    return {label:'Gold spot XAU/USD',symbol:'XAUUSD',last,previousClose:null,change:null,pct:null,timestamp,source:'XAUS public spot API',mode:stale?'STALE PUBLIC QUOTE':'PUBLIC WEB QUOTE',delayMinutes:Number.isFinite(age)?Math.round(age/60):null,isStale:stale};
  }catch(e){console.warn('XAUS gold spot failed',e.message);return null}
}

async function fredLatest(series,label,range){
  try{
    const csv=await fetchText(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${series}`,{timeout:12000});
    const rows=csv.trim().split(/\r?\n/).slice(1).map(line=>line.split(',')).filter(x=>x.length>=2&&x[1]!=='.');
    const validRows=rows.map(([date,value])=>({date,value:inRange(value,range)})).filter(x=>x.value!=null);
    const a=validRows.at(-1),b=validRows.at(-2);if(!a)throw new Error('missing FRED observation');
    const change=b?a.value-b.value:null,pct=b&&b.value?change/b.value*100:null;
    return {label,series,last:a.value,previousClose:b?.value??null,change,pct,timestamp:`${a.date}T00:00:00Z`,source:'FRED / EIA daily spot',mode:'DAILY',delayMinutes:null};
  }catch(e){console.warn('FRED commodity spot failed',label,series,e.message);return {label,series,last:null,previousClose:null,change:null,pct:null,timestamp:null,source:'FRED / EIA daily spot',mode:'UNAVAILABLE',delayMinutes:null}}
}

async function fallbackSpot(stooqSymbols,fredSeries,label,range){const s=await stooqQuote(stooqSymbols,range,label);if(s.last!=null)return s;return fredSeries?await fredLatest(fredSeries,label,range):s}
async function goldSpotQuote(){const s=await stooqQuote(['xauusd'],[100,10000],'Gold spot XAU/USD');if(s.last!=null)return s;const x=await xausGoldSpot();return x||s}

const [goldSpot,silverSpot,wtiSpot,brentSpot,copperSpot,gasSpot,goldFuture,silverFuture,wtiFuture,brentFuture,copperFuture,gasFuture]=await Promise.all([
  goldSpotQuote(),
  stooqQuote(['xagusd'],[1,300],'Silver spot XAG/USD'),
  fallbackSpot(['cl.f','cl.c','wti'],'DCOILWTICO','WTI Cushing spot',[5,300]),
  fallbackSpot(['brent.c','brn.c','brent'],'DCOILBRENTEU','Brent Europe spot',[5,300]),
  fallbackSpot(['copper','copper.usd'],null,'Copper spot reference',[1,20]),
  fallbackSpot(['naturalgas','natgas'],'DHHNGSP','Henry Hub natural gas spot',[0.5,30]),
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
  BRENT:{id:'BRENT',name:'Brent 原油',spot:brentSpot,future:brentFuture,futureCode:'BZ'},
  COPPER:{id:'COPPER',name:'銅',spot:copperSpot,future:copperFuture,futureCode:'HG'},
  NATGAS:{id:'NATGAS',name:'天然氣',spot:gasSpot,future:gasFuture,futureCode:'NG'}
};
const out={meta:{source:'Stooq + XAUS + FRED/EIA + Yahoo Finance',mode:'MIXED PUBLIC/DELAYED/DAILY',realtime:false,generatedAt:new Date().toISOString(),note:'Price-comparison first: public spot/reference quotes are preferred when available; gold has an XAUS public API fallback with its own freshness timestamp. Yahoo futures are explicitly tagged DELAYED (10 min reference delay) and FRED/EIA fallbacks are DAILY. No synthetic price path is created.'},commodities};
await fs.mkdir('data',{recursive:true});
await fs.writeFile('data/commodities-latest.json',JSON.stringify(out,null,2)+'\n');
console.log('Wrote data/commodities-latest.json');
for(const [id,x] of Object.entries(commodities))console.log(id,'spot',x.spot.last,x.spot.source,x.spot.mode,'future',x.future.last,x.future.source,x.future.mode,'series',x.future.series?.length||0);
