import fs from 'node:fs/promises';

const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36 global-market-monitor/1.6';
const PAIRS=['EUR/USD','GBP/USD','USD/JPY','USD/CHF','USD/CAD','AUD/USD','NZD/USD','USD/CNH','USD/HKD'];
const num=v=>{if(v==null||v==='')return null;const x=Number(String(v).replace(/,/g,'').trim());return Number.isFinite(x)?x:null};
const strip=s=>String(s).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
async function get(url){const r=await fetch(url,{redirect:'follow',headers:{'user-agent':UA,'accept':'text/html,application/xhtml+xml,*/*;q=0.8','accept-language':'en-US,en;q=0.9'}});if(!r.ok)throw new Error(`${r.status} ${url}`);return await r.text()}
function compactAsk(bidText,askSuffix){const bid=num(bidText),suffix=String(askSuffix||'').replace(/[^0-9]/g,'');if(bid==null||!suffix)return null;const scale=10**suffix.length;let ask=Math.floor(bid)+Number(suffix)/scale;while(ask<bid)ask+=1;return ask}
function validPair(pair,bid,ask){if(bid==null||ask==null||ask<bid)return false;const maxSpread=pair.includes('JPY')?0.5:pair.includes('CNH')||pair.includes('HKD')?0.05:0.02;return ask-bid<=maxSpread}
function esc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function parseQuoteList(text,pair){const p=esc(pair);const re=new RegExp(`${p}\\s+([\\d,.]+)\\s+([\\d,.]+)\\s+(-?[\\d,.]+)\\s+(-?[\\d,.]+)%[\\s\\S]{0,180}?(\\d{1,2}:\\d{2}:\\d{2})`,'i');const m=text.match(re);if(!m)return null;const bid=num(m[1]),ask=num(m[2]),change=num(m[3]),pct=num(m[4]);if(!validPair(pair,bid,ask))return null;return {pair,bid,ask,mid:(bid+ask)/2,change,pct,time:m[5],source:'NetDania Forex Majors',mode:'PUBLIC WEB QUOTE'};}
async function parseMobile(pair){const slug=pair.replace('/','').toLowerCase();try{const text=strip(await get(`https://m.netdania.com/currencies/${slug}/idc-lite`));const m=text.match(new RegExp(`${esc(pair)}\\s+([\\d,.]+)\\/([\\d]+)`,'i')),tm=text.match(/(\\d{1,2}-[A-Za-z]+-\\d{2}\\s+\\d{2}:\\d{2}:\\d{2})/);if(!m)return null;const bid=num(m[1]),ask=compactAsk(m[1],m[2]);if(!validPair(pair,bid,ask))return null;return {pair,bid,ask,mid:(bid+ask)/2,change:null,pct:null,time:tm?.[1]||null,source:'NetDania Mobile',mode:'PUBLIC WEB QUOTE'};}catch{return null}}

let page='';try{page=strip(await get('https://www.netdania.com/quotes/'))}catch(e){console.warn('NetDania majors page failed:',e.message)}
const quotes=[];
for(const pair of PAIRS){let q=page?parseQuoteList(page,pair):null;if(!q)q=await parseMobile(pair);if(q)quotes.push(q);else quotes.push({pair,bid:null,ask:null,mid:null,change:null,pct:null,time:null,source:'NetDania',mode:'UNAVAILABLE'})}
const available=quotes.filter(q=>q.bid!=null&&q.ask!=null).length;
const out={meta:{generatedAt:new Date().toISOString(),source:'NetDania public web quotes',quoteMode:'PUBLIC WEB QUOTE',realtimeLicensed:false,note:'Overview FX spot bridge. Public web quotes are not treated as a licensed realtime market-data feed.'},quotes};
await fs.mkdir('data',{recursive:true});
await fs.writeFile('data/fx-latest.json',JSON.stringify(out,null,2)+'\n');
console.log(`Wrote data/fx-latest.json: ${available}/${PAIRS.length} pairs available`);
if(available<5)process.exitCode=2;
