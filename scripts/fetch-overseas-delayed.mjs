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
const num=v=>{if(v==null)return null;const n=Number(String(v).replace(/,/g,''));return Number.isFinite(n)?n:null};
const valid=(v,range)=>{const x=num(v);return x!=null&&x>=range[0]&&x<=range[1]?x:null};
function symbolMonth(symbol){const m=String(symbol).match(/([FGHJKMNQUVXZ])(\d{2})\.[A-Z]+$/i);if(!m)return null;const y=2000+Number(m[2]),mo=MONTH_CODE[m[1].toUpperCase()];return `${y}${String(mo).padStart(2,'0')}`}
function tvMonth(symbol){const m=String(symbol).match(/([FGHJKMNQUVXZ])(20\d{2})$/i);if(!m)return null;return `${m[2]}${String(MONTH_CODE[m[1].toUpperCase()]).padStart(2,'0')}`}
function dateMonth(sec){if(!sec)return null;const d=new Date(Number(sec)*1000);return `${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}`}
function cookiesFrom(headers){const raw=headers.getSetCookie?.()||[];return raw.map(x=>x.split(';')[0]).join('; ')}
async function request(url,{accept='text/html,application/json;q=0.9,*/*;q=0.8',cookie='',method='GET',body=null,headers={}}={}){const r=await fetch(url,{method,body,headers:{'user-agent':UA,accept,'accept-language':'en-US,en;q=0.9',...(cookie?{cookie}:{}),...headers}});if(!r.ok)throw new Error(`${r.status} ${url}`);return r}
async function fetchText(url,opt={}){return await (await request(url,opt)).text()}
async function fetchJson(url,opt={}){return await (await request(url,{...opt,accept:'application/json,text/plain,*/*'})).json()}

let yahooSession=null;
async function yahooAuth(){
  if(yahooSession)return yahooSession;
  try{
    const seed=await request('https://fc.yahoo.com/',{accept:'text/html,*/*'});
    const cookie=cookiesFrom(seed.headers);
    const crumb=(await fetchText('https://query1.finance.yahoo.com/v1/test/getcrumb',{cookie,accept:'text/plain,*/*'})).trim();
    if(!cookie||!crumb||crumb.includes('<'))throw new Error('missing Yahoo cookie/crumb');
    yahooSession={cookie,crumb};
    console.log('Yahoo authenticated quote session ready');
    return yahooSession;
  }catch(e){console.warn('Yahoo crumb session unavailable',e.message);yahooSession={cookie:'',crumb:''};return yahooSession}
}
async function yahooChain(root){try{const html=await fetchText(`https://finance.yahoo.com/quote/${encodeURIComponent(root+'=F')}/futures/`);const rx=new RegExp(`${root}[FGHJKMNQUVXZ]\\d{2}\\.[A-Z]+`,'gi');return [...new Set(html.match(rx)||[])].slice(0,8)}catch(e){console.warn('Yahoo chain failed',root,e.message);return []}}
async function yahooApiQuote(symbol,range){
  const sess=await yahooAuth();
  if(sess.crumb){
    try{
      const url=`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}&crumb=${encodeURIComponent(sess.crumb)}`;
      const j=await fetchJson(url,{cookie:sess.cookie});
      const q=j?.quoteResponse?.result?.[0];
      if(q){return {symbol,month:symbolMonth(symbol)||dateMonth(q.expireDate),bid:valid(q.bid,range),ask:valid(q.ask,range),last:valid(q.regularMarketPrice,range),timestamp:q.regularMarketTime?new Date(q.regularMarketTime*1000).toISOString():null,quoteType:'Yahoo authenticated quote'}}
    }catch(e){console.warn('Yahoo authenticated quote failed',symbol,e.message)}
  }
  try{
    const url=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
    const j=await fetchJson(url);
    const m=j?.chart?.result?.[0]?.meta;
    if(m){return {symbol,month:symbolMonth(symbol)||dateMonth(m.expireDate),bid:null,ask:null,last:valid(m.regularMarketPrice,range),timestamp:m.regularMarketTime?new Date(m.regularMarketTime*1000).toISOString():null,quoteType:'Yahoo chart fallback'}}
  }catch(e){console.warn('Yahoo chart API failed',symbol,e.message)}
  return null;
}
async function yahooRootProduct(t,source='Yahoo Finance'){
  let symbols=await yahooChain(t.root);const root=t.root+'=F';if(!symbols.length)symbols=[root];const contracts=[];
  for(const s of symbols.slice(0,5)){const q=await yahooApiQuote(s,t.range);if(q?.month&&(q.bid!=null||q.ask!=null||q.last!=null))contracts.push(q)}
  if(!contracts.length&&symbols[0]!==root){const q=await yahooApiQuote(root,t.range);if(q?.month&&(q.bid!=null||q.ask!=null||q.last!=null))contracts.push(q)}
  contracts.sort((a,b)=>String(a.month).localeCompare(String(b.month)));const usable=contracts.find(x=>x.last!=null||x.bid!=null||x.ask!=null)||contracts[0]||null;return {defaultMonth:usable?.month||null,contracts,source,mode:'DELAYED'};
}

async function tradingViewContracts({id,url,prefix,range}){
  try{
    const html=await fetchText(url,{headers:{referer:'https://www.tradingview.com/'}});
    const rx=new RegExp(`${prefix}[FGHJKMNQUVXZ]20\\d{2}`,'gi');
    const symbols=[...new Set(html.match(rx)||[])].slice(0,12);
    const contracts=[];
    for(const symbol of symbols){
      const pos=html.indexOf(symbol);if(pos<0)continue;const chunk=html.slice(pos,Math.min(html.length,pos+5000));
      let last=null;
      for(const re of [/"close"\s*:\s*(-?[\d.]+)/i,/"lp"\s*:\s*(-?[\d.]+)/i,/"price"\s*:\s*(-?[\d.]+)/i,/>\s*([\d,]+(?:\.\d+)?)\s*</]){const m=chunk.match(re);if(m){last=valid(m[1],range);if(last!=null)break}}
      const month=tvMonth(symbol);if(month&&last!=null)contracts.push({symbol,month,bid:null,ask:null,last,timestamp:new Date().toISOString(),quoteType:'TradingView delayed page'});
    }
    contracts.sort((a,b)=>a.month.localeCompare(b.month));
    return {defaultMonth:contracts[0]?.month||null,contracts,source:'TradingView · OSE delayed fallback',mode:contracts.length?'DELAYED':'UNAVAILABLE'};
  }catch(e){console.warn('TradingView JPX fallback failed',id,e.message);return {defaultMonth:null,contracts:[],source:'TradingView · OSE delayed fallback',mode:'UNAVAILABLE'}}
}
async function nikkei225jpMini(){
  try{
    const html=await fetchText('https://nikkei225jp.com/cme/');
    const contracts=[];
    const re=/大証ミニ\s*(\d{2})年(\d{1,2})月限\s*([\d,]+)/g;let m;
    while((m=re.exec(html))){const month=`20${m[1]}${String(m[2]).padStart(2,'0')}`,last=valid(m[3],[1000,100000]);if(last!=null)contracts.push({symbol:`OSE Nikkei225 mini ${month}`,month,bid:null,ask:null,last,timestamp:new Date().toISOString(),quoteType:'nikkei225jp public table'})}
    return {defaultMonth:contracts[0]?.month||null,contracts,source:'nikkei225jp.com · OSE public quote fallback',mode:contracts.length?'DELAYED':'UNAVAILABLE'};
  }catch(e){console.warn('nikkei225jp fallback failed',e.message);return {defaultMonth:null,contracts:[],source:'nikkei225jp.com · OSE public quote fallback',mode:'UNAVAILABLE'}}
}

const products={};for(const t of ROOTS)products[t.id]=await yahooRootProduct(t);
products.JPX_MINI_TOPIX=await tradingViewContracts({id:'JPX_MINI_TOPIX',url:'https://www.tradingview.com/symbols/OSE-TOPIXM1!/contracts/',prefix:'TOPIXM',range:[100,10000]});
products.JPX_NIKKEI225_MINI=await tradingViewContracts({id:'JPX_NIKKEI225_MINI',url:'https://www.tradingview.com/symbols/OSE-NK225M1!/contracts/',prefix:'NK225M',range:[1000,100000]});
if(!products.JPX_NIKKEI225_MINI.contracts.length)products.JPX_NIKKEI225_MINI=await nikkei225jpMini();
products.ICE_BRENT_MINI=await yahooRootProduct({id:'ICE_BRENT_MINI',root:'BZ',exchange:'Brent reference',range:[10,300]},'Yahoo Finance · Brent delayed benchmark');
const out={meta:{source:'Yahoo Finance + JPX delayed fallbacks',mode:'DELAYED',realtime:false,generatedAt:new Date().toISOString(),note:'CME contract months come from Yahoo Finance futures chains. Yahoo Bid/Ask uses a cookie+crumb quote session when available and falls back to Last-only chart data. JPX/OSE uses delayed public-page fallbacks and does not synthesize Bid/Ask. Values outside instrument-specific sanity ranges are discarded. LIVE broker connectors can override delayed data.'},products};
await fs.mkdir('data',{recursive:true});await fs.writeFile('data/overseas-delayed.json',JSON.stringify(out,null,2)+'\n');console.log('Wrote data/overseas-delayed.json');for(const [id,p] of Object.entries(products))console.log(id,p.defaultMonth,p.contracts?.length||0,p.contracts?.[0]?.bid,p.contracts?.[0]?.ask,p.contracts?.[0]?.last,p.source,p.contracts?.[0]?.quoteType||'');
