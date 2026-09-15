import fs from 'node:fs/promises';

const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36 global-market-monitor/1.0';
const MONTH_CODE={F:1,G:2,H:3,J:4,K:5,M:6,N:7,Q:8,U:9,V:10,X:11,Z:12};
const ROOTS=[
  {id:'CME_MES',root:'MES',exchange:'CME',range:[100,20000]},
  {id:'CME_MNQ',root:'MNQ',exchange:'CME',range:[1000,100000]},
  {id:'CBOT_MYM',root:'MYM',exchange:'CBOT/CME',range:[1000,100000]},
  {id:'COMEX_MGC',root:'MGC',exchange:'COMEX/CME',range:[100,20000]},
  {id:'COMEX_MGC_TWD',root:'MGC',exchange:'COMEX/CME',range:[100,20000]},
  {id:'CME_6E',root:'6E',exchange:'CME',range:[0.1,5]},
  {id:'CME_6J',root:'6J',exchange:'CME',range:[0.0001,0.1]},
  {id:'CME_6B',root:'6B',exchange:'CME',range:[0.1,5]},
  {id:'CME_6A',root:'6A',exchange:'CME',range:[0.1,5]}
];
async function fetchText(url,accept='text/html,application/json;q=0.9,*/*;q=0.8'){const r=await fetch(url,{headers:{'user-agent':UA,accept,'accept-language':'en-US,en;q=0.9'}});if(!r.ok)throw new Error(`${r.status} ${url}`);return await r.text()}
const num=v=>{if(v==null)return null;const n=Number(String(v).replace(/,/g,''));return Number.isFinite(n)?n:null};
function valid(v,range){const x=num(v);return x!=null&&x>=range[0]&&x<=range[1]?x:null}
function symbolMonth(symbol){const m=String(symbol).match(/([FGHJKMNQUVXZ])(\d{2})\.[A-Z]+$/i);if(!m)return null;const y=2000+Number(m[2]),mo=MONTH_CODE[m[1].toUpperCase()];return `${y}${String(mo).padStart(2,'0')}`}
function dateMonth(sec){if(!sec)return null;const d=new Date(Number(sec)*1000);return `${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}`}
async function yahooChain(root){try{const html=await fetchText(`https://finance.yahoo.com/quote/${encodeURIComponent(root+'=F')}/futures/`);const rx=new RegExp(`${root}[FGHJKMNQUVXZ]\\d{2}\\.[A-Z]+`,'gi');return [...new Set(html.match(rx)||[])].slice(0,8)}catch(e){console.warn('Yahoo chain failed',root,e.message);return []}}
async function yahooApiQuote(symbol,range){
  try{
    const url=`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
    const j=JSON.parse(await fetchText(url,'application/json'));
    const q=j?.quoteResponse?.result?.[0];
    if(q){return {symbol,month:symbolMonth(symbol)||dateMonth(q.expireDate),bid:valid(q.bid,range),ask:valid(q.ask,range),last:valid(q.regularMarketPrice,range),timestamp:q.regularMarketTime?new Date(q.regularMarketTime*1000).toISOString():null}}
  }catch(e){console.warn('Yahoo quote API failed',symbol,e.message)}
  try{
    const url=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
    const j=JSON.parse(await fetchText(url,'application/json'));
    const m=j?.chart?.result?.[0]?.meta;
    if(m){return {symbol,month:symbolMonth(symbol)||dateMonth(m.expireDate),bid:null,ask:null,last:valid(m.regularMarketPrice,range),timestamp:m.regularMarketTime?new Date(m.regularMarketTime*1000).toISOString():null}}
  }catch(e){console.warn('Yahoo chart API failed',symbol,e.message)}
  return null;
}
async function yahooRootProduct(t,source='Yahoo Finance'){
  let symbols=await yahooChain(t.root);const root=t.root+'=F';if(!symbols.length)symbols=[root];const contracts=[];
  for(const s of symbols.slice(0,5)){const q=await yahooApiQuote(s,t.range);if(q?.month&&(q.bid!=null||q.ask!=null||q.last!=null))contracts.push(q)}
  if(!contracts.length&&symbols[0]!==root){const q=await yahooApiQuote(root,t.range);if(q?.month&&(q.bid!=null||q.ask!=null||q.last!=null))contracts.push(q)}
  contracts.sort((a,b)=>String(a.month).localeCompare(String(b.month)));const usable=contracts.find(x=>x.last!=null||x.bid!=null||x.ask!=null)||contracts[0]||null;return {defaultMonth:usable?.month||null,contracts,source,mode:'DELAYED'};
}
async function investingProduct(url,id,source){try{const html=await fetchText(url);const pm=html.match(/Futures\s*-\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{2})/i);const lm=html.match(/data-test="instrument-price-last"[^>]*>([\d.,-]+)/i);if(!pm||!lm)return {defaultMonth:null,contracts:[],source,mode:'UNAVAILABLE'};const names=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];const month=`20${pm[2]}${String(names.indexOf(pm[1])+1).padStart(2,'0')}`,last=num(lm[1]);return {defaultMonth:month,contracts:last!=null?[{month,bid:null,ask:null,last,timestamp:new Date().toISOString()}]:[],source,mode:'DELAYED'}}catch(e){console.warn('Investing fallback failed',id,e.message);return {defaultMonth:null,contracts:[],source,mode:'UNAVAILABLE'}}}

const products={};for(const t of ROOTS)products[t.id]=await yahooRootProduct(t);
products.JPX_MINI_TOPIX=await investingProduct('https://www.investing.com/indices/topix-futures-scoreboard','JPX_MINI_TOPIX','Investing.com · Tokyo delayed');
products.JPX_NIKKEI225_MINI=await investingProduct('https://www.investing.com/indices/japan-225-futures-scoreboard','JPX_NIKKEI225_MINI','Investing.com · Tokyo delayed');
products.ICE_BRENT_MINI=await yahooRootProduct({id:'ICE_BRENT_MINI',root:'BZ',exchange:'Brent reference',range:[10,300]},'Yahoo Finance · Brent delayed benchmark');
const out={meta:{source:'Yahoo Finance + Investing.com fallback',mode:'DELAYED',realtime:false,generatedAt:new Date().toISOString(),note:'CME delayed quotes and contract months are sourced from Yahoo Finance. Invalid/out-of-range values are discarded. JPX attempts Investing.com and remains unavailable when automation is blocked. Brent uses Yahoo BZ delayed benchmark as quote reference for the mini contract. LIVE broker connectors override delayed data.'},products};
await fs.mkdir('data',{recursive:true});await fs.writeFile('data/overseas-delayed.json',JSON.stringify(out,null,2)+'\n');console.log('Wrote data/overseas-delayed.json');for(const [id,p] of Object.entries(products))console.log(id,p.defaultMonth,p.contracts?.length||0,p.contracts?.[0]?.bid,p.contracts?.[0]?.ask,p.contracts?.[0]?.last,p.source);
