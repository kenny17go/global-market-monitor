import fs from 'node:fs/promises';

const DATA_PATH='data/usdtwd-fx.json';
const BOT_TXT='https://rate.bot.com.tw/xrt/fltxt/0/day';
const UA='Mozilla/5.0 global-market-monitor/1.0';
const num=v=>{const x=Number(v);return Number.isFinite(x)?x:null};
const mid=(b,a)=>(b!=null&&a!=null)?(b+a)/2:null;
const fwdOk=(b,a)=>b!=null&&a!=null&&Math.abs(b)<=5&&Math.abs(a)<=5&&Math.abs(a-b)<=1;

async function fetchText(url){
  const r=await fetch(url,{redirect:'follow',headers:{'user-agent':UA,'accept':'text/plain,*/*;q=0.8'}});
  if(!r.ok)throw new Error(`HTTP ${r.status}`);
  return await r.text();
}

function parseUsdLine(text){
  const line=String(text).replace(/^\uFEFF/,'').split(/\r?\n/).find(x=>/^USD\s+/i.test(x.trim()));
  if(!line)throw new Error('BOT plain-text USD row not found');
  const t=line.trim().split(/\s+/);
  // Stable field positions in BOT plain-text file, independent of Chinese/English labels:
  // USD [buy-label] cash spot 10D 30D 60D 90D 120D 150D 180D [sell-label] cash spot 10D 30D 60D 90D 120D 150D 180D
  if(t.length<21||String(t[0]).toUpperCase()!=='USD')throw new Error(`BOT USD row unexpected: ${line}`);
  const values={
    spotBid:num(t[3]), spotAsk:num(t[13]),
    f30Bid:num(t[5]), f30Ask:num(t[15]),
    f90Bid:num(t[7]), f90Ask:num(t[17]),
    f180Bid:num(t[10]), f180Ask:num(t[20])
  };
  for(const [k,v] of Object.entries(values))if(v==null||v<20||v>50)throw new Error(`BOT invalid ${k}: ${v}`);
  return values;
}

const data=JSON.parse(await fs.readFile(DATA_PATH,'utf8'));
if(Object.keys(data?.onshore?.curve||{}).length){
  console.log('Onshore already available from higher-priority source:',data.onshore.source);
  process.exit(0);
}

try{
  const raw=await fetchText(BOT_TXT);
  const q=parseUsdLine(raw);
  if(data?.spot?.bid==null||data?.spot?.ask==null){
    data.spot={...(data.spot||{}),bid:q.spotBid,ask:q.spotAsk,mid:mid(q.spotBid,q.spotAsk),source:'Bank of Taiwan plain-text FX rates',mode:'BANK QUOTE',fallback:true};
  }
  const mk=(tenor,days,fBid,fAsk)=>{
    const bid=fBid-q.spotBid, ask=fAsk-q.spotAsk;
    if(!fwdOk(bid,ask))throw new Error(`${tenor} invalid swap points ${bid}/${ask}`);
    return {bid,ask,mid:mid(bid,ask),outrightBid:fBid,outrightAsk:fAsk,outrightMid:mid(fBid,fAsk),spotBid:q.spotBid,spotAsk:q.spotAsk,actualTenor:`${days}D`};
  };
  data.onshore={
    source:'Bank of Taiwan plain-text FX rates',market:'ONSHORE TAIPEI',mode:'BANK QUOTE',quoteType:'FORWARD POINTS',fallback:true,
    curve:{
      '1M':mk('1M',30,q.f30Bid,q.f30Ask),
      '3M':mk('3M',90,q.f90Bid,q.f90Ask),
      '6M':mk('6M',180,q.f180Bid,q.f180Ask)
    },
    note:'Fallback only. Exact tenor mapping: 1M=30D, 3M=90D, 6M=180D. Swap points = same-bank forward minus same-bank spot.'
  };
  data.meta=data.meta||{};
  data.meta.botFallback='PLAIN_TEXT';
  data.meta.note='BOT fallback uses official plain-text quote file for missing spot and exact 30D/90D/180D forwards only; Yahoo Finance remains the 1D/5m intraday trend source.';
  const tenors=['1W','1M','3M','6M','1Y'];
  data.spread=data.spread||{};
  for(const t of tenors){
    const on=data.onshore.curve?.[t]||{},off=data.offshore?.curve?.[t]||{};
    data.spread[t]={
      pointsMid:on.mid!=null&&off.mid!=null?off.mid-on.mid:null,
      outrightMid:on.outrightMid!=null&&off.outrightMid!=null?off.outrightMid-on.outrightMid:null
    };
  }
  await fs.writeFile(DATA_PATH,JSON.stringify(data,null,2)+'\n');
  console.log('BOT plain-text fallback applied:',JSON.stringify(data.onshore.curve));
}catch(e){
  console.warn('BOT plain-text fallback failed:',e.message);
}
