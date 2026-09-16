import fs from 'node:fs/promises';

const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36 global-market-monitor/1.0';
async function get(url){const r=await fetch(url,{redirect:'follow',headers:{'user-agent':UA,'accept':'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8','accept-language':'en-US,en;q=0.9'}});if(!r.ok)throw new Error(`${r.status} ${url}`);return await r.text()}
const num=v=>{if(v==null)return null;const x=Number(String(v).replace(/,/g,'').trim());return Number.isFinite(x)?x:null};
const strip=s=>String(s).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
const mid=(b,a)=>b!=null&&a!=null?(b+a)/2:null;
const outright=(spot,pts)=>spot!=null&&pts!=null?spot+pts:null;

async function netdaniaSpot(){
  try{
    const text=strip(await get('https://m.netdania.com/currencies/usdtwd/idc-lite'));
    const m=text.match(/USD\/TWD\s+([\d,.]+)\/([\d,.]+)/i);
    const tm=text.match(/(\d{1,2}-[A-Za-z]+-\d{2}\s+\d{2}:\d{2}:\d{2})/);
    if(!m)return {bid:null,ask:null,mid:null,time:null,source:'NetDania',mode:'UNAVAILABLE'};
    const bid=num(m[1]),ask=num(m[2]);
    return {bid,ask,mid:mid(bid,ask),time:tm?.[1]||null,source:'NetDania',mode:'REALTIME WEB'};
  }catch(e){console.warn('NetDania spot failed:',e.message);return {bid:null,ask:null,mid:null,time:null,source:'NetDania',mode:'UNAVAILABLE'}}
}

async function netdaniaOffshore(){
  try{
    const html=await get('https://www.netdania.com/quotes/forex-usdforwards');
    const text=strip(html);
    const m=text.match(/USD\/TWD\s+(-?[\d,.]+)\s+(-?[\d,.]+)\s+(-?[\d,.]+)\s+(-?[\d,.]+)\s+(-?[\d,.]+)\s+(-?[\d,.]+)\s+(-?[\d,.]+)\s+(-?[\d,.]+)\s+(-?[\d,.]+)\s+(-?[\d,.]+)/i);
    if(!m)throw new Error('USD/TWD row not found');
    const tenors=['1W','1M','3M','6M','1Y'];const curve={};
    tenors.forEach((t,i)=>{const bid=num(m[1+i*2]),ask=num(m[2+i*2]);curve[t]={bid,ask,mid:mid(bid,ask)}});
    return {source:'NetDania USD Forwards',market:'OFFSHORE',mode:'WEB QUOTE',curve};
  }catch(e){console.warn('NetDania forwards failed:',e.message);return {source:'NetDania USD Forwards',market:'OFFSHORE',mode:'UNAVAILABLE',curve:{}}}
}

async function investingOnshore(){
  try{
    const html=await get('https://www.investing.com/currencies/usd-twd-forward-rates');
    const text=strip(html);const curve={};
    for(const t of ['1W','1M','3M','6M','1Y']){
      const re=new RegExp(`USDTWD\\s*${t}\\s*FWD\\s+(-?[\\d,.]+)\\s+(-?[\\d,.]+)`,'i');
      const m=text.match(re);if(m){const bid=num(m[1]),ask=num(m[2]);curve[t]={bid,ask,mid:mid(bid,ask)}}
    }
    return {source:'Investing.com USD/TWD Forward Rates',market:'ONSHORE',mode:Object.keys(curve).length?'WEB QUOTE':'UNAVAILABLE',curve};
  }catch(e){console.warn('Investing forwards failed:',e.message);return {source:'Investing.com USD/TWD Forward Rates',market:'ONSHORE',mode:'UNAVAILABLE',curve:{}}}
}

const spot=await netdaniaSpot();
const offshore=await netdaniaOffshore();
const onshore=await investingOnshore();
const tenors=['1W','1M','3M','6M','1Y'];
for(const t of tenors){
  for(const bucket of [offshore,onshore]){
    const p=bucket.curve?.[t];if(p){p.outrightBid=outright(spot.bid,p.bid);p.outrightAsk=outright(spot.ask,p.ask);p.outrightMid=outright(spot.mid,p.mid)}
  }
}
const spread={};
for(const t of tenors){
  const o=offshore.curve?.[t],n=onshore.curve?.[t];
  spread[t]={pointsMid:o?.mid!=null&&n?.mid!=null?o.mid-n.mid:null,outrightMid:o?.outrightMid!=null&&n?.outrightMid!=null?o.outrightMid-n.outrightMid:null};
}
const out={meta:{generatedAt:new Date().toISOString(),realtime:false,note:'USD/TWD spot, onshore forward and offshore forward/NDF-style curve are intentionally kept separate. Public web quotes may be delayed and are for monitoring, not execution.'},spot,onshore,offshore,spread};
await fs.mkdir('data',{recursive:true});
await fs.writeFile('data/usdtwd-fx.json',JSON.stringify(out,null,2)+'\n');
console.log('Wrote data/usdtwd-fx.json');
console.log('spot',spot.bid,spot.ask,spot.source,spot.mode);
console.log('offshore',offshore.mode,offshore.curve);
console.log('onshore',onshore.mode,onshore.curve);
