import fs from 'node:fs/promises';

const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36 global-market-monitor/1.0';
const MONTH_CODE={F:1,G:2,H:3,J:4,K:5,M:6,N:7,Q:8,U:9,V:10,X:11,Z:12};
const ROOTS=[
  {id:'CME_MES',root:'MES',exchange:'CME',range:[100,20000]},
  {id:'CME_MNQ',root:'MNQ',exchange:'CME',range:[1000,100000]},
  {id:'CBOT_MYM',root:'MYM',exchange:'CBOT/CME',range:[1000,100000]},
  {id:'CME_SOX',root:'SOX',exchange:'CME',range:[100,20000]},
  {id:'COMEX_MGC',root:'MGC',exchange:'COMEX/CME',range:[100,20000]},
  {id:'COMEX_MGC_TWD',root:'MGC',exchange:'COMEX/CME',range:[100,20000]},
  {id:'CME_6E',root:'6E',exchange:'CME',range:[0.1,5]},
  {id:'CME_6J',root:'6J',exchange:'CME',range:[0.0001,0.1]},
  {id:'CME_6B',root:'6B',exchange:'CME',range:[0.1,5]},
  {id:'CME_6A',root:'6A',exchange:'CME',range:[0.1,5]}
];
const num=v=>{if(v==null)return null;const n=Number(String(v).replace(/,/g,''));return Number.isFinite(n)?n:null};
const valid=(v,range)=>{const x=num(v);return x!=null&&x>=range[0]&&x<=range[1]?x:null};
const stripHtml=s=>String(s).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
function symbolMonth(symbol){const m=String(symbol).match(/([FGHJKMNQUVXZ])(\d{2})\.[A-Z]+$/i);if(!m)return null;const y=2000+Number(m[2]),mo=MONTH_CODE[m[1].toUpperCase()];return `${y}${String(mo).padStart(2,'0')}`}
function futuresMonth(symbol){const m=String(symbol).match(/([FGHJKMNQUVXZ])(\d{1,2})$/i);if(!m)return null;const yy=Number(m[2]),y=yy<70?2000+yy:1900+yy,mo=MONTH_CODE[m[1].toUpperCase()];return `${y}${String(mo).padStart(2,'0')}`}
function dateMonth(sec){if(!sec)return null;const d=new Date(Number(sec)*1000);return `${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}`}
function cookiesFrom(headers){const raw=headers.getSetCookie?.()||[];return raw.map(x=>x.split(';')[0]).filter(Boolean).join('; ')}
function mergeCookies(a,b){return [...new Set(`${a||''}; ${b||''}`.split(';').map(x=>x.trim()).filter(Boolean))].join('; ')}
async function request(url,{accept='text/html,application/json;q=0.9,*/*;q=0.8',cookie='',method='GET',body=null,headers={}}={}){const r=await fetch(url,{method,body,redirect:'follow',headers:{'user-agent':UA,accept,'accept-language':'en-US,en;q=0.9',...(cookie?{cookie}:{}),...headers}});if(!r.ok)throw new Error(`${r.status} ${url}`);return r}
async function fetchText(url,opt={}){return await (await request(url,opt)).text()}
async function fetchJson(url,opt={}){return await (await request(url,{...opt,accept:'application/json,text/plain,*/*'})).json()}

let yahooSession=null;
async function yahooAuth(){
  if(yahooSession)return yahooSession;
  try{
    let cookie='';
    for(const seedUrl of ['https://finance.yahoo.com/quote/MES=F/','https://finance.yahoo.com/']){try{const seed=await request(seedUrl,{accept:'text/html,*/*'});cookie=mergeCookies(cookie,cookiesFrom(seed.headers));if(cookie)break}catch{}}
    let crumb='';
    for(const host of ['https://query2.finance.yahoo.com','https://query1.finance.yahoo.com']){try{crumb=(await fetchText(`${host}/v1/test/getcrumb`,{cookie,accept:'text/plain,*/*'})).trim();if(crumb&&!crumb.includes('<'))break}catch{}}
    if(!crumb)throw new Error('missing Yahoo crumb');
    yahooSession={cookie,crumb};console.log('Yahoo authenticated quote session ready',cookie?'with cookie':'crumb-only');return yahooSession;
  }catch(e){console.warn('Yahoo crumb session unavailable',e.message);yahooSession={cookie:'',crumb:''};return yahooSession}
}
async function yahooChain(root){try{const html=await fetchText(`https://finance.yahoo.com/quote/${encodeURIComponent(root+'=F')}/futures/`);const rx=new RegExp(`${root}[FGHJKMNQUVXZ]\\d{2}\\.[A-Z]+`,'gi');return [...new Set(html.match(rx)||[])].slice(0,8)}catch(e){console.warn('Yahoo chain failed',root,e.message);return []}}
async function yahooApiQuote(symbol,range){
  const sess=await yahooAuth();
  if(sess.crumb){for(const host of ['https://query2.finance.yahoo.com','https://query1.finance.yahoo.com']){try{const j=await fetchJson(`${host}/v7/finance/quote?symbols=${encodeURIComponent(symbol)}&crumb=${encodeURIComponent(sess.crumb)}`,{cookie:sess.cookie});const q=j?.quoteResponse?.result?.[0];if(q)return {symbol,month:symbolMonth(symbol)||dateMonth(q.expireDate),bid:valid(q.bid,range),ask:valid(q.ask,range),last:valid(q.regularMarketPrice,range),timestamp:q.regularMarketTime?new Date(q.regularMarketTime*1000).toISOString():null,quoteType:'Yahoo authenticated quote'}}catch(e){console.warn('Yahoo authenticated quote failed',host,symbol,e.message)}}}
  try{const j=await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`);const m=j?.chart?.result?.[0]?.meta;if(m)return {symbol,month:symbolMonth(symbol)||dateMonth(m.expireDate),bid:null,ask:null,last:valid(m.regularMarketPrice,range),timestamp:m.regularMarketTime?new Date(m.regularMarketTime*1000).toISOString():null,quoteType:'Yahoo chart fallback'}}catch(e){console.warn('Yahoo chart API failed',symbol,e.message)}
  return null;
}
async function yahooRootProduct(t,source='Yahoo Finance'){let symbols=await yahooChain(t.root);const root=t.root+'=F';if(!symbols.length)symbols=[root];const contracts=[];for(const s of symbols.slice(0,5)){const q=await yahooApiQuote(s,t.range);if(q?.month&&(q.bid!=null||q.ask!=null||q.last!=null))contracts.push(q)}if(!contracts.length&&symbols[0]!==root){const q=await yahooApiQuote(root,t.range);if(q?.month&&(q.bid!=null||q.ask!=null||q.last!=null))contracts.push(q)}contracts.sort((a,b)=>String(a.month).localeCompare(String(b.month)));return {defaultMonth:contracts[0]?.month||null,contracts:contracts.map(c=>({...c,delayMinutes:10})),source,mode:contracts.length?'DELAYED':'UNAVAILABLE',delayMinutes:10}}

const BARCHART_API_KEY=String(process.env.BARCHART_API_KEY||'').trim();
function barchartMode(mode){const m=String(mode||'').toUpperCase();return m==='R'?'LIVE':m==='D'?'OFFICIAL DAILY':m==='I'?'DELAYED':'DELAYED'}
async function barchartRootProduct({root,range,label}){
  if(!BARCHART_API_KEY)return {defaultMonth:null,contracts:[],source:`Barchart OnDemand · ${label}`,mode:'UNAVAILABLE',reason:'BARCHART_API_KEY not configured'};
  try{
    const url=`https://ondemand.websol.barchart.com/getQuote.json?apikey=${encodeURIComponent(BARCHART_API_KEY)}&symbols=${encodeURIComponent(root+'^F')}`;
    const j=await fetchJson(url),rows=Array.isArray(j?.results)?j.results:[];
    const contracts=[];
    for(const q of rows){
      const month=futuresMonth(q.symbol);if(!month)continue;
      const bid=valid(q.bid,range),ask=valid(q.ask,range),last=valid(q.lastPrice,range);
      if(bid==null&&ask==null&&last==null)continue;
      contracts.push({symbol:q.symbol,month,bid,ask,last,timestamp:q.tradeTimestamp||q.serverTimestamp||null,quoteType:`Barchart OnDemand ${barchartMode(q.mode)}`,quoteMode:barchartMode(q.mode),delayMinutes:null});
    }
    contracts.sort((a,b)=>a.month.localeCompare(b.month));
    const modes=[...new Set(contracts.map(x=>x.quoteMode))];
    return {defaultMonth:contracts[0]?.month||null,contracts,source:`Barchart OnDemand · ${label}`,mode:modes.length===1?modes[0]:(contracts.length?'MIXED':'UNAVAILABLE'),delayMinutes:null};
  }catch(e){console.warn('Barchart fallback failed',root,e.message);return {defaultMonth:null,contracts:[],source:`Barchart OnDemand · ${label}`,mode:'UNAVAILABLE',reason:e.message}}
}
function mergeProducts(primary,fallback,label){
  const map=new Map();
  for(const c of fallback?.contracts||[])map.set(c.month,{...c});
  for(const c of primary?.contracts||[]){const old=map.get(c.month)||{};map.set(c.month,{...old,...c,bid:c.bid??old.bid??null,ask:c.ask??old.ask??null,last:c.last??old.last??null,timestamp:c.timestamp||old.timestamp||null,quoteType:[c.quoteType,old.quoteType].filter(Boolean).join(' + fallback '),quoteMode:c.quoteMode||old.quoteMode||primary.mode||fallback.mode||null,delayMinutes:c.delayMinutes??old.delayMinutes??primary.delayMinutes??fallback.delayMinutes??null})}
  const contracts=[...map.values()].filter(c=>c.month&&(c.bid!=null||c.ask!=null||c.last!=null)).sort((a,b)=>a.month.localeCompare(b.month));
  const usedFallback=(fallback?.contracts||[]).some(f=>{const p=(primary?.contracts||[]).find(x=>x.month===f.month);return !p||p.bid==null&&f.bid!=null||p.ask==null&&f.ask!=null||p.last==null&&f.last!=null});
  return {defaultMonth:primary?.defaultMonth||fallback?.defaultMonth||contracts[0]?.month||null,contracts,source:usedFallback?`${primary?.source||'Primary'} + ${fallback?.source||'fallback'}`:(primary?.source||fallback?.source||label),mode:primary?.mode!=='UNAVAILABLE'?primary.mode:(fallback?.mode||'UNAVAILABLE'),delayMinutes:primary?.delayMinutes??fallback?.delayMinutes??null};
}

function localDateKey(sec,timeZone){
  try{return new Intl.DateTimeFormat('en-CA',{timeZone:timeZone||'UTC',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(sec*1000))}catch{return new Date(sec*1000).toISOString().slice(0,10)}
}
async function yahooIndexQuote(id,symbol,label,range){
  try{
    const j=await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m&range=1d`);
    const r=j?.chart?.result?.[0],m=r?.meta;
    const last=valid(m?.regularMarketPrice,range),prev=valid(m?.chartPreviousClose??m?.previousClose,range);
    if(last==null)throw new Error('missing market price');
    const change=prev!=null?last-prev:null,pct=prev?change/prev*100:null;
    const ts=Array.isArray(r?.timestamp)?r.timestamp:[];
    const close=Array.isArray(r?.indicators?.quote?.[0]?.close)?r.indicators.quote[0].close:[];
    const points=[];
    for(let i=0;i<Math.min(ts.length,close.length);i++){
      const t=Number(ts[i]),v=valid(close[i],range);
      if(!Number.isFinite(t)||v==null)continue;
      points.push({t,v});
    }
    return {
      id,symbol,label,last,previousClose:prev,change,pct,
      timestamp:m?.regularMarketTime?new Date(m.regularMarketTime*1000).toISOString():new Date().toISOString(),
      source:'Yahoo Finance',mode:'DELAYED',
      series:points.map(x=>x.v),
      seriesTimes:points.map(x=>new Date(x.t*1000).toISOString()),
      seriesMeta:{range:'1D',interval:'5m',session:'LATEST_SESSION',source:'Yahoo Finance',mode:'DELAYED',timezone:m?.exchangeTimezoneName||null,points:points.length}
    };
  }catch(e){
    console.warn('Yahoo index failed',id,symbol,e.message);
    return {id,symbol,label,last:null,previousClose:null,change:null,pct:null,timestamp:null,source:'Yahoo Finance',mode:'UNAVAILABLE',series:[],seriesTimes:[],seriesMeta:{range:'1D',interval:'5m',session:'LATEST_SESSION',source:'Yahoo Finance',mode:'UNAVAILABLE',points:0}};
  }
}

async function nikkei225jpMini(){try{const plain=stripHtml(await fetchText('https://nikkei225jp.com/cme/'));const contracts=[];const re=/大証ミニ\s*(\d{2})年(\d{1,2})月限\s*([\d,]+)/g;let m;while((m=re.exec(plain))){const month=`20${m[1]}${String(m[2]).padStart(2,'0')}`,last=valid(m[3],[1000,100000]);if(last!=null)contracts.push({symbol:`OSE Nikkei225 mini ${month}`,month,bid:null,ask:null,last,timestamp:new Date().toISOString(),quoteType:'nikkei225jp public table',quoteMode:'DELAYED',delayMinutes:15})}return {defaultMonth:contracts[0]?.month||null,contracts,source:'nikkei225jp.com · OSE public quote fallback',mode:contracts.length?'DELAYED':'UNAVAILABLE',delayMinutes:15}}catch(e){console.warn('nikkei225jp fallback failed',e.message);return {defaultMonth:null,contracts:[],source:'nikkei225jp.com · OSE public quote fallback',mode:'UNAVAILABLE'}}}

const INDEX_TARGETS=[
  {id:'SPX',symbol:'^GSPC',label:'S&P 500',range:[100,20000]},
  {id:'NDX',symbol:'^NDX',label:'Nasdaq-100',range:[1000,100000]},
  {id:'SOX',symbol:'^SOX',label:'SOX 費半',range:[100,20000]},
  {id:'TAIEX',symbol:'^TWII',label:'台灣加權',range:[1000,100000]},
  {id:'NIKKEI',symbol:'^N225',label:'日經 225',range:[1000,100000]},
  {id:'TOPIX',symbol:'^TOPX',label:'東證 TOPIX',range:[100,10000]}
];
const indices={};for(const x of INDEX_TARGETS)indices[x.id]=await yahooIndexQuote(x.id,x.symbol,x.label,x.range);
const products={};for(const t of ROOTS)products[t.id]=await yahooRootProduct(t);

const [bcNikkei,bcTopix,bcMgc,bcBrent]=await Promise.all([
  barchartRootProduct({root:'NP',range:[1000,100000],label:'JPX Nikkei 225 mini'}),
  barchartRootProduct({root:'TS',range:[100,10000],label:'JPX mini-TOPIX'}),
  barchartRootProduct({root:'MGC',range:[100,20000],label:'COMEX Micro Gold'}),
  barchartRootProduct({root:'CB',range:[10,300],label:'ICE Brent'})
]);

products.JPX_NIKKEI225_MINI=mergeProducts(bcNikkei,await nikkei225jpMini(),'JPX Nikkei 225 mini');
products.JPX_MINI_TOPIX=bcTopix;
products.COMEX_MGC=mergeProducts(products.COMEX_MGC,bcMgc,'COMEX Micro Gold');
products.COMEX_MGC_TWD=mergeProducts(products.COMEX_MGC_TWD,bcMgc,'COMEX Micro Gold');
const yahooBrent=await yahooRootProduct({id:'ICE_BRENT_MINI',root:'BZ',exchange:'Brent reference',range:[10,300]},'Yahoo Finance · Brent delayed benchmark');
products.ICE_BRENT_MINI=mergeProducts(yahooBrent,bcBrent,'ICE Brent');

const out={meta:{source:BARCHART_API_KEY?'Yahoo Finance + Barchart OnDemand + public fallbacks':'Yahoo Finance + public fallbacks (Barchart key not configured)',mode:'MIXED',realtime:false,generatedAt:new Date().toISOString(),note:'TradingView is no longer used as a JPX/OSE quote source. Yahoo remains the first public source for CME/COMEX and Brent benchmark data. When BARCHART_API_KEY is configured, Barchart OnDemand supplements missing contract Bid/Ask/Last for JPX Nikkei 225 mini, mini-TOPIX, COMEX Micro Gold and ICE Brent. Barchart mode/timestamps are preserved; missing Bid/Ask are never synthesized. Without a Barchart key, Nikkei 225 mini can fall back to a public delayed Last quote and mini-TOPIX remains unavailable rather than fabricated.'},indices,products};
await fs.mkdir('data',{recursive:true});await fs.writeFile('data/overseas-delayed.json',JSON.stringify(out,null,2)+'\n');console.log('Wrote data/overseas-delayed.json');for(const [id,p] of Object.entries(products))console.log(id,p.defaultMonth,p.contracts?.length||0,p.contracts?.[0]?.bid,p.contracts?.[0]?.ask,p.contracts?.[0]?.last,p.source,p.contracts?.[0]?.quoteType||'');
