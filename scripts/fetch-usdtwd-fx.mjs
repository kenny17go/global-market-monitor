import fs from 'node:fs/promises';

const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36 global-market-monitor/1.2';
async function get(url){const r=await fetch(url,{redirect:'follow',headers:{'user-agent':UA,'accept':'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8','accept-language':'en-US,en;q=0.9'}});if(!r.ok)throw new Error(`${r.status} ${url}`);return await r.text()}
const num=v=>{if(v==null||v==='')return null;const x=Number(String(v).replace(/,/g,'').trim());return Number.isFinite(x)?x:null};
const strip=s=>String(s).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
const mid=(b,a)=>b!=null&&a!=null?(b+a)/2:null;
const outright=(spot,pts)=>spot!=null&&pts!=null?spot+pts:null;
const spotOk=(b,a)=>b!=null&&a!=null&&b>=20&&b<=50&&a>=b&&a<=50&&(a-b)<=0.5;
const fwdOk=(b,a)=>b!=null&&a!=null&&Math.abs(b)<=5&&Math.abs(a)<=5&&Math.abs(a-b)<=1;
const TENORS=['1W','1M','3M','6M','1Y'];

function compactFxAsk(bidText,askSuffix){const bid=num(bidText),suffix=String(askSuffix||'').replace(/[^0-9]/g,'');if(bid==null||!suffix)return null;const scale=10**suffix.length;let ask=Math.floor(bid)+Number(suffix)/scale;while(ask<bid)ask+=1;return ask}

async function netdaniaSpot(){try{const text=strip(await get('https://m.netdania.com/currencies/usdtwd/idc-lite'));const m=text.match(/USD\/TWD\s+([\d,.]+)\/([\d]+)/i),tm=text.match(/(\d{1,2}-[A-Za-z]+-\d{2}\s+\d{2}:\d{2}:\d{2})/);if(!m)throw new Error('USD/TWD compact quote not found');const bid=num(m[1]),ask=compactFxAsk(m[1],m[2]);if(!spotOk(bid,ask))throw new Error(`invalid reconstructed spot ${bid}/${ask}`);return {bid,ask,mid:mid(bid,ask),time:tm?.[1]||null,raw:m[0],source:'NetDania',mode:'WEB QUOTE'}}catch(e){console.warn('NetDania spot failed:',e.message);return {bid:null,ask:null,mid:null,time:null,source:'NetDania',mode:'UNAVAILABLE'}}}

async function netdaniaOffshore(){try{const text=strip(await get('https://www.netdania.com/quotes/forex-usdforwards'));const tableStart=text.search(/Name\s+1W Bid\s+1W Ask\s+1M Bid/i);if(tableStart<0)throw new Error('forward table header not found');const tableEnd=text.indexOf('Comments',tableStart),tableText=text.slice(tableStart,tableEnd>tableStart?tableEnd:tableStart+12000);const m=tableText.match(/USD\/TWD\s+(-?[\d,.]+)\s+(-?[\d,.]+)\s+(-?[\d,.]+)\s+(-?[\d,.]+)\s+(-?[\d,.]+)\s+(-?[\d,.]+)\s+(-?[\d,.]+)\s+(-?[\d,.]+)\s+(-?[\d,.]+)\s+(-?[\d,.]+)/i);if(!m)throw new Error('USD/TWD row not found');const curve={};TENORS.forEach((t,i)=>{const bid=num(m[1+i*2]),ask=num(m[2+i*2]);curve[t]=fwdOk(bid,ask)?{bid,ask,mid:mid(bid,ask)}:{bid:null,ask:null,mid:null,invalidRaw:[bid,ask]}});return {source:'NetDania USD Forwards',market:'OFFSHORE',mode:Object.values(curve).some(x=>x.mid!=null)?'WEB QUOTE':'UNAVAILABLE',quoteType:'FORWARD POINTS',curve,rawRow:m[0]}}catch(e){console.warn('NetDania offshore failed:',e.message);return {source:'NetDania USD Forwards',market:'OFFSHORE',mode:'UNAVAILABLE',quoteType:'FORWARD POINTS',curve:{}}}}

async function investingOnshore(){try{const text=strip(await get('https://www.investing.com/currencies/usd-twd-forward-rates')),curve={};const aliases={'1W':'SW','1M':'1M','3M':'3M','6M':'6M','1Y':'1Y'};for(const [t,label] of Object.entries(aliases)){const m=text.match(new RegExp(`USDTWD\\s*${label}\\s*FWD\\s+(-?[\\d,.]+)\\s+(-?[\\d,.]+)`,'i'));if(m){const bid=num(m[1]),ask=num(m[2]);if(fwdOk(bid,ask))curve[t]={bid,ask,mid:mid(bid,ask)}}}if(!Object.keys(curve).length)throw new Error('Investing curve unavailable');return {source:'Investing.com USD/TWD Forward Rates',market:'ONSHORE TAIPEI',mode:'WEB QUOTE',quoteType:'FORWARD POINTS',curve}}catch(e){console.warn('Investing onshore failed:',e.message);return {source:'Investing.com USD/TWD Forward Rates',market:'ONSHORE TAIPEI',mode:'UNAVAILABLE',quoteType:'FORWARD POINTS',curve:{}}}}

async function cbondsOnshore(){try{const text=strip(await get('https://cbonds.com/indexes/219633/')),curve={};for(const t of TENORS){const m=text.match(new RegExp(`USD/TWD\\s+${t}\\s+FX Forward Rate\\s+([\\d,.]+)\\s+(\\d{2}/\\d{2}/\\d{4})`,'i'));if(m){const value=num(m[1]);if(value>=20&&value<=50)curve[t]={bid:null,ask:null,mid:null,outrightMid:value,date:m[2],benchmark:true}}}if(!Object.keys(curve).length)throw new Error('Cbonds subgroup values not found');return {source:'Cbonds USD/TWD FX Forward Rate (Onshore Taipei)',market:'ONSHORE TAIPEI',mode:'DAILY CLOSE',quoteType:'OUTRIGHT BENCHMARK',fallback:true,curve}}catch(e){console.warn('Cbonds onshore failed:',e.message);return {source:'Cbonds Onshore Taipei',market:'ONSHORE TAIPEI',mode:'UNAVAILABLE',quoteType:'OUTRIGHT BENCHMARK',fallback:true,curve:{}}}}

const spot=await netdaniaSpot();
const offshore=await netdaniaOffshore();
let onshore=await investingOnshore();
if(!Object.keys(onshore.curve||{}).length)onshore=await cbondsOnshore();
const validSpot=spotOk(spot.bid,spot.ask);
for(const t of TENORS){for(const bucket of [offshore,onshore]){const p=bucket.curve?.[t];if(!p||bucket.quoteType==='OUTRIGHT BENCHMARK')continue;if(validSpot&&p.mid!=null){p.outrightBid=outright(spot.bid,p.bid);p.outrightAsk=outright(spot.ask,p.ask);p.outrightMid=outright(spot.mid,p.mid)}else{p.outrightBid=null;p.outrightAsk=null;p.outrightMid=null}}}
const spread={};
for(const t of TENORS){const on=onshore.curve?.[t]||{},off=offshore.curve?.[t]||{};spread[t]={pointsMid:on.mid!=null&&off.mid!=null?off.mid-on.mid:null,outrightMid:on.outrightMid!=null&&off.outrightMid!=null?off.outrightMid-on.outrightMid:null}}
const out={meta:{generatedAt:new Date().toISOString(),realtime:false,spotValidated:validSpot,sourcePolicy:'Offshore = NetDania 1W/1M/3M/6M/1Y. Onshore = Investing.com; fallback whole curve to Cbonds Taipei daily close when Investing is unavailable.',note:'Cbonds values are outright daily benchmarks, never treated as forward points. Spread is shown only where both selected sources provide comparable values.'},spot,onshore,offshore,spread};
await fs.mkdir('data',{recursive:true});await fs.writeFile('data/usdtwd-fx.json',JSON.stringify(out,null,2)+'\n');
console.log('Wrote data/usdtwd-fx.json');console.log('spot',spot.bid,spot.ask,spot.mode);console.log('onshore',onshore.source,onshore.mode,JSON.stringify(onshore.curve));console.log('offshore NetDania',offshore.mode,JSON.stringify(offshore.curve));
