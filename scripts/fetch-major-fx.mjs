import fs from 'node:fs/promises';

const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36 global-market-monitor/1.7';
const PAIRS=['EUR/USD','GBP/USD','USD/JPY','USD/CHF','USD/CAD','AUD/USD','NZD/USD','USD/CNH','USD/HKD'];
const TENORS=['1W','1M','3M','6M','1Y'];
const num=v=>{if(v==null||v==='')return null;const x=Number(String(v).replace(/,/g,'').trim());return Number.isFinite(x)?x:null};
const strip=s=>String(s).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
async function get(url){const r=await fetch(url,{redirect:'follow',headers:{'user-agent':UA,'accept':'text/html,application/xhtml+xml,*/*;q=0.8','accept-language':'en-US,en;q=0.9'}});if(!r.ok)throw new Error(`${r.status} ${url}`);return await r.text()}
function compactAsk(bidText,askSuffix){const raw=String(bidText).replace(/,/g,'').trim(),bid=num(raw),suffix=String(askSuffix||'').replace(/[^0-9]/g,'');if(bid==null||!suffix)return null;const decimals=(raw.split('.')[1]||'').length,k=suffix.length;if(!decimals||k>decimals)return null;const scale=10**decimals,block=10**k,bidInt=Math.round(bid*scale);let askInt=Math.floor(bidInt/block)*block+Number(suffix);if(askInt<bidInt)askInt+=block;return askInt/scale}
function validPair(pair,bid,ask){if(bid==null||ask==null||ask<bid)return false;const maxSpread=pair.includes('JPY')?0.1:pair.includes('CNH')||pair.includes('HKD')?0.01:0.01;return ask-bid<=maxSpread}
function validForward(bid,ask){return bid!=null&&ask!=null&&Number.isFinite(bid)&&Number.isFinite(ask)&&ask>=bid&&Math.abs(bid)<=1e6&&Math.abs(ask)<=1e6}
function esc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function parseQuoteList(text,pair){const p=esc(pair);const re=new RegExp(`${p}\\s+([\\d,.]+)\\s+([\\d,.]+)\\s+(-?[\\d,.]+)\\s+(-?[\\d,.]+)%[\\s\\S]{0,180}?(\\d{1,2}:\\d{2}:\\d{2})`,'i');const m=text.match(re);if(!m)return null;const bid=num(m[1]),ask=num(m[2]),change=num(m[3]),pct=num(m[4]);if(!validPair(pair,bid,ask))return null;return {pair,bid,ask,mid:(bid+ask)/2,change,pct,time:m[5],source:'NetDania Forex Majors',mode:'PUBLIC WEB QUOTE'};}
async function parseMobile(pair){const slug=pair.replace('/','').toLowerCase();try{const text=strip(await get(`https://m.netdania.com/currencies/${slug}/idc-lite`));const m=text.match(new RegExp(`${esc(pair)}\\s+([\\d,.]+)\\/([\\d]+)`,'i')),tm=text.match(/(\\d{1,2}-[A-Za-z]+-\\d{2}\\s+\\d{2}:\\d{2}:\\d{2})/);if(!m)return null;const bid=num(m[1]),ask=compactAsk(m[1],m[2]);if(!validPair(pair,bid,ask))return null;return {pair,bid,ask,mid:(bid+ask)/2,change:null,pct:null,time:tm?.[1]||null,source:'NetDania Mobile',mode:'PUBLIC WEB QUOTE'};}catch{return null}}
function parseForwardRow(text,pair){
  const p=esc(pair),m=text.match(new RegExp(`${p}\\s+(-?[\\d,.]+)\\s+(-?[\\d,.]+)\\s+(-?[\\d,.]+)\\s+(-?[\\d,.]+)\\s+(-?[\\d,.]+)\\s+(-?[\\d,.]+)\\s+(-?[\\d,.]+)\\s+(-?[\\d,.]+)\\s+(-?[\\d,.]+)\\s+(-?[\\d,.]+)`,'i'));
  if(!m)return null;
  const curve={};
  TENORS.forEach((tenor,i)=>{const bid=num(m[1+i*2]),ask=num(m[2+i*2]);curve[tenor]=validForward(bid,ask)?{bid,ask,mid:(bid+ask)/2}:{bid:null,ask:null,mid:null,invalidRaw:[bid,ask]}});
  return curve;
}

let page='';try{page=strip(await get('https://www.netdania.com/quotes/'))}catch(e){console.warn('NetDania majors page failed:',e.message)}
let fwdPage='';try{fwdPage=strip(await get('https://www.netdania.com/quotes/forex-usdforwards'))}catch(e){console.warn('NetDania forward page failed:',e.message)}
const quotes=[];
for(const pair of PAIRS){
  let q=page?parseQuoteList(page,pair):null;if(!q)q=await parseMobile(pair);if(!q)q={pair,bid:null,ask:null,mid:null,change:null,pct:null,time:null,source:'NetDania',mode:'UNAVAILABLE'};
  const curve=fwdPage?parseForwardRow(fwdPage,pair):null;
  q.forwards=curve||{};
  q.forwardSource=curve?'NetDania USD Forwards':'NetDania USD Forwards';
  q.forwardMode=curve?'PUBLIC WEB QUOTE':'UNAVAILABLE';
  q.p1m=curve?.['1M']?.mid??null;q.p3m=curve?.['3M']?.mid??null;q.p6m=curve?.['6M']?.mid??null;q.p1y=curve?.['1Y']?.mid??null;
  quotes.push(q);
}
const available=quotes.filter(q=>q.bid!=null&&q.ask!=null).length;
const forwardAvailable=quotes.filter(q=>q.p1m!=null||q.p3m!=null||q.p6m!=null||q.p1y!=null).length;
const out={meta:{generatedAt:new Date().toISOString(),source:'NetDania public web quotes',quoteMode:'PUBLIC WEB QUOTE',forwardSource:'NetDania USD Forwards',forwardQuoteType:'RAW FORWARD POINTS',realtimeLicensed:false,note:'Overview FX spot and forward-points bridge. Public web quotes are not treated as a licensed realtime market-data feed. Forward values are displayed as source-native raw forward points; no synthetic fill.'},quotes};
await fs.mkdir('data',{recursive:true});
await fs.writeFile('data/fx-latest.json',JSON.stringify(out,null,2)+'\n');
console.log(`Wrote data/fx-latest.json: ${available}/${PAIRS.length} spot pairs, ${forwardAvailable}/${PAIRS.length} forward curves available`);
if(available<5)process.exitCode=2;
