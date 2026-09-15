import fs from 'node:fs/promises';

const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36 global-market-monitor/1.0';
const MONTH_CODE={F:1,G:2,H:3,J:4,K:5,M:6,N:7,Q:8,U:9,V:10,X:11,Z:12};
const ROOTS=[
  {id:'CME_MES',root:'MES',exchange:'CME'},
  {id:'CME_MNQ',root:'MNQ',exchange:'CME'},
  {id:'CBOT_MYM',root:'MYM',exchange:'CBOT/CME'},
  {id:'COMEX_MGC',root:'MGC',exchange:'COMEX/CME'},
  {id:'COMEX_MGC_TWD',root:'MGC',exchange:'COMEX/CME'},
  {id:'CME_6E',root:'6E',exchange:'CME'},
  {id:'CME_6J',root:'6J',exchange:'CME'},
  {id:'CME_6B',root:'6B',exchange:'CME'},
  {id:'CME_6A',root:'6A',exchange:'CME'}
];

async function text(url){
  const r=await fetch(url,{headers:{'user-agent':UA,accept:'text/html,application/json;q=0.9,*/*;q=0.8','accept-language':'en-US,en;q=0.9'}});
  if(!r.ok)throw new Error(`${r.status} ${url}`);
  return await r.text();
}
const num=v=>{if(v==null)return null;const n=Number(String(v).replace(/,/g,''));return Number.isFinite(n)?n:null};
const first=(s,patterns)=>{for(const p of patterns){const m=s.match(p);if(m)return m[1]}return null};
function symbolMonth(symbol){
  const m=String(symbol).match(/([FGHJKMNQUVXZ])(\d{2})\.[A-Z]+$/i);if(!m)return null;
  const y=2000+Number(m[2]),mo=MONTH_CODE[m[1].toUpperCase()];return `${y}${String(mo).padStart(2,'0')}`;
}
function settlementMonth(html){
  const date=first(html,[/Settlement Date<\/span>[^<]*<span[^>]*>(\d{4}-\d{2}-\d{2})/i,/Settlement Date[^0-9]{0,80}(\d{4}-\d{2}-\d{2})/i,/"expireDate":(?:\{"raw":)?(\d{10,13})/i]);
  if(!date)return null;
  if(/^\d{4}-/.test(date))return date.slice(0,7).replace('-','');
  const d=new Date(Number(date)*(String(date).length===10?1000:1));return `${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}`;
}
function parseYahooQuote(html,symbol){
  const bid=num(first(html,[/"bid":\{"raw":(-?[\d.]+)/,/"bid":(-?[\d.]+)/,/Bid<\/span>[^<]*<span[^>]*>([\d.,-]+)/i,/Bid[^0-9-]{0,80}([\d,.]+)/i]));
  const ask=num(first(html,[/"ask":\{"raw":(-?[\d.]+)/,/"ask":(-?[\d.]+)/,/Ask<\/span>[^<]*<span[^>]*>([\d.,-]+)/i,/Ask[^0-9-]{0,80}([\d,.]+)/i]));
  const last=num(first(html,[/"regularMarketPrice":\{"raw":(-?[\d.]+)/,/"regularMarketPrice":(-?[\d.]+)/,/Last Price<\/span>[^<]*<span[^>]*>([\d.,-]+)/i,/Last Price[^0-9-]{0,80}([\d,.]+)/i]));
  const timestamp=first(html,[/"regularMarketTime":\{"raw":(\d+)/,/"regularMarketTime":(\d+)/]);
  return {symbol,month:symbolMonth(symbol)||settlementMonth(html),bid,ask,last,timestamp:timestamp?new Date(Number(timestamp)*1000).toISOString():null};
}
async function yahooChain(root){
  const chainUrl=`https://finance.yahoo.com/quote/${encodeURIComponent(root+'=F')}/futures/`;
  try{
    const html=await text(chainUrl);
    const rx=new RegExp(`${root}[FGHJKMNQUVXZ]\\d{2}\\.[A-Z]+`,'gi');
    return [...new Set(html.match(rx)||[])].slice(0,8);
  }catch(e){console.warn('Yahoo chain failed',root,e.message);return []}
}
async function yahooPageQuote(symbol){
  try{return parseYahooQuote(await text(`https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/`),symbol)}catch(e){console.warn('Yahoo quote page failed',symbol,e.message);return null}
}
async function yahooRootProduct(t){
  let symbols=await yahooChain(t.root);
  const rootSymbol=t.root+'=F';
  const rootQuote=await yahooPageQuote(rootSymbol);
  if(!symbols.length && rootQuote?.month) symbols=[rootSymbol];
  const contracts=[];
  for(const s of symbols.slice(0,5)){
    const q=s===rootSymbol?rootQuote:await yahooPageQuote(s);
    if(q?.month&&(q.bid!=null||q.ask!=null||q.last!=null))contracts.push(q);
  }
  if(!contracts.length&&rootQuote?.month)contracts.push(rootQuote);
  contracts.sort((a,b)=>String(a.month).localeCompare(String(b.month)));
  const usable=contracts.find(x=>x.last!=null||x.bid!=null||x.ask!=null)||contracts[0]||null;
  return {defaultMonth:usable?.month||null,contracts,source:'Yahoo Finance',mode:'DELAYED'};
}

function parseInvesting(html, fallbackMonth=null){
  const last=num(first(html,[/data-test="instrument-price-last"[^>]*>([\d.,-]+)/i,/"last":\s*"?([\d.,-]+)"?/i,/"last_close":\s*"?([\d.,-]+)"?/i]));
  const bid=num(first(html,[/data-test="bid"[^>]*>([\d.,-]+)/i,/"bid":\s*"?([\d.,-]+)"?/i]));
  const ask=num(first(html,[/data-test="ask"[^>]*>([\d.,-]+)/i,/"ask":\s*"?([\d.,-]+)"?/i]));
  const titleMonth=first(html,[/Futures\s*-\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{2})/i]);
  let month=fallbackMonth;
  if(titleMonth){const names=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];const parts=html.match(/Futures\s*-\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{2})/i);month=`20${parts[2]}${String(names.indexOf(parts[1])+1).padStart(2,'0')}`}
  return {month,bid,ask,last,timestamp:new Date().toISOString()};
}
async function investingProduct(url,id,defaultMonth=null,source='Investing.com delayed'){
  try{const q=parseInvesting(await text(url),defaultMonth);return {defaultMonth:q.month,contracts:q.month&&q.last!=null?[q]:[],source,mode:'DELAYED'}}catch(e){console.warn('Investing fallback failed',id,e.message);return {defaultMonth:null,contracts:[],source,mode:'UNAVAILABLE'}}
}

const products={};
for(const t of ROOTS){products[t.id]=await yahooRootProduct(t)}
products.JPX_MINI_TOPIX=await investingProduct('https://www.investing.com/indices/topix-futures-scoreboard','JPX_MINI_TOPIX',null,'Investing.com · Tokyo delayed');
products.JPX_NIKKEI225_MINI=await investingProduct('https://www.investing.com/indices/japan-225-futures-scoreboard','JPX_NIKKEI225_MINI',null,'Investing.com · Tokyo delayed');
products.ICE_BRENT_MINI=await investingProduct('https://www.investing.com/commodities/brent-oil','ICE_BRENT_MINI',null,'Investing.com · Brent delayed reference');

const out={meta:{source:'Yahoo Finance + Investing.com',mode:'DELAYED',realtime:false,generatedAt:new Date().toISOString(),note:'Delayed public quote snapshot. Bid/Ask are left null when the source does not expose them; LIVE broker connectors can override this file.'},products};
await fs.mkdir('data',{recursive:true});
await fs.writeFile('data/overseas-delayed.json',JSON.stringify(out,null,2)+'\n');
console.log('Wrote data/overseas-delayed.json');
for(const [id,p] of Object.entries(products))console.log(id,p.defaultMonth,p.contracts?.length||0,p.source);
