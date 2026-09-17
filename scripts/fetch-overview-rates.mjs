import fs from 'node:fs/promises';

const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) global-market-monitor/1.2';
const today=new Date();
const year=today.getUTCFullYear();
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>`${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
const clean=s=>String(s??'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
const num=v=>{const n=Number(String(v??'').replace(/,/g,'').trim());return Number.isFinite(n)?n:null};
async function text(url,timeout=20000){const r=await fetch(url,{headers:{'user-agent':UA,'accept':'text/html,application/xhtml+xml,application/xml,text/xml,*/*','accept-language':'en-US,en;q=0.9'},redirect:'follow',signal:AbortSignal.timeout(timeout)});if(!r.ok)throw new Error(`${r.status} ${url}`);return await r.text()}
async function json(url,timeout=20000){const r=await fetch(url,{headers:{'user-agent':UA,'accept':'application/json,*/*'},redirect:'follow',signal:AbortSignal.timeout(timeout)});if(!r.ok)throw new Error(`${r.status} ${url}`);return await r.json()}
function nextDate(dates){const now=ymd(today);return dates.find(d=>d>=now)||'—'}

// --- U.S. Treasury official daily curve ---
const treasuryEndpoint=`https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value=${year}`;
const treasuryXml=await text(treasuryEndpoint);
const entries=[...treasuryXml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m=>m[1]);
const field=(s,name)=>{const m=s.match(new RegExp(`<d:${name}[^>]*>([^<]+)<\\/d:${name}>`,'i'));return m?m[1].trim():null};
const dateOf=s=>field(s,'NEW_DATE')||field(s,'NEW_DATE_VALUE');
const rows=entries.map(s=>({date:dateOf(s),raw:s})).filter(x=>x.date).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
const latest=rows.at(-1);
if(!latest)throw new Error('No Treasury yield curve rows found');
const curveMap=[['1M','BC_1MONTH'],['3M','BC_3MONTH'],['6M','BC_6MONTH'],['1Y','BC_1YEAR'],['2Y','BC_2YEAR'],['5Y','BC_5YEAR'],['10Y','BC_10YEAR'],['30Y','BC_30YEAR']];
const curve=curveMap.map(([tenor,key])=>{const v=Number(field(latest.raw,key));return {tenor,yield:Number.isFinite(v)?v:null}});
if(curve.filter(x=>x.yield!=null).length<6)throw new Error('Incomplete Treasury curve');

// --- Policy rates: official/public central-bank pages, with conservative last-known fallback ---
const FED_MEETINGS=['2026-01-28','2026-03-18','2026-04-29','2026-06-17','2026-07-29','2026-09-16','2026-10-28','2026-12-09','2027-01-27','2027-03-17','2027-04-28','2027-06-09','2027-07-28','2027-09-15','2027-10-27','2027-12-08'];
const ECB_MEETINGS=['2026-10-29','2026-12-17','2027-02-04','2027-03-18','2027-04-29','2027-06-10','2027-07-22','2027-09-09','2027-10-28','2027-12-16'];
const BOJ_MEETINGS=['2026-09-18','2026-10-30','2026-12-18','2027-01-26','2027-03-19','2027-04-28','2027-06-17','2027-07-30','2027-09-22','2027-10-29','2027-12-17'];
const BOE_MEETINGS=['2026-09-17','2026-11-05','2026-12-17','2027-02-04','2027-03-18','2027-04-29','2027-06-17','2027-07-29','2027-09-16','2027-11-04','2027-12-16'];
const CBC_MEETINGS=['2026-09-17','2026-12-17'];
const PBOC_DATES=['2026-09-21','2026-10-20','2026-11-20','2026-12-21'];

const policy={
  FED:{name:'美國 Fed',rate:3.875,displayRate:'3.75–4.00%',next:nextDate(FED_MEETINGS),source:'Federal Reserve',mode:'OFFICIAL'},
  ECB:{name:'歐元區 ECB',rate:2.50,displayRate:'2.50%',next:nextDate(ECB_MEETINGS),source:'ECB · Deposit Facility',mode:'OFFICIAL'},
  BOJ:{name:'日本 BOJ',rate:1.00,displayRate:'1.00%',next:nextDate(BOJ_MEETINGS),source:'Bank of Japan',mode:'OFFICIAL'},
  BOE:{name:'英國 BOE',rate:3.75,displayRate:'3.75%',next:nextDate(BOE_MEETINGS),source:'Bank of England',mode:'OFFICIAL'},
  CBC:{name:'台灣 CBC',rate:2.00,displayRate:'2.00%',next:nextDate(CBC_MEETINGS),source:'CBC Taiwan · Discount Rate',mode:'OFFICIAL'},
  HKMA:{name:'香港 HKMA',rate:null,displayRate:'—',next:'依 Fed 調整',source:'HKMA · Base Rate',mode:'OFFICIAL'},
  PBOC:{name:'中國 PBOC',rate:3.00,displayRate:'3.00%',next:nextDate(PBOC_DATES),source:'PBOC/NIFC · 1Y LPR',mode:'OFFICIAL MONTHLY'}
};

// Fed: fetch the most recent scheduled FOMC statement using its predictable official URL.
try{
  const now=ymd(today),past=FED_MEETINGS.filter(d=>d<=now),d=past.at(-1);
  if(d){const compact=d.replaceAll('-',''),t=clean(await text(`https://www.federalreserve.gov/newsevents/pressreleases/monetary${compact}a.htm`));const m=t.match(/target range for the federal funds rate[^.]{0,160}?(\d+(?:\.\d+)?(?:-\d+\/\d+)?)\s+to\s+(\d+(?:\.\d+)?(?:-\d+\/\d+)?)/i);const frac=s=>{if(!s)return null;if(s.includes('-')){const [a,b]=s.split('-'),[n,d]=b.split('/').map(Number);return Number(a)+n/d}return Number(s)};if(m){const lo=frac(m[1]),hi=frac(m[2]);if(Number.isFinite(lo)&&Number.isFinite(hi)){policy.FED.rate=(lo+hi)/2;policy.FED.displayRate=`${lo.toFixed(2)}–${hi.toFixed(2)}%`;policy.FED.asOf=d}}}
}catch(e){console.warn('Fed policy fetch failed:',e.message)}

try{const t=clean(await text('https://www.ecb.europa.eu/press/press_conference/html/index.en.html'));const m=t.match(/Deposit facility\s+(\d+(?:\.\d+)?)\s*%/i);if(m){policy.ECB.rate=Number(m[1]);policy.ECB.displayRate=`${Number(m[1]).toFixed(2)}%`;policy.ECB.asOf=ymd(today)}}catch(e){console.warn('ECB policy fetch failed:',e.message)}
try{const t=clean(await text('https://www.boj.or.jp/'));const m=t.match(/補完当座預金制度適用利率\s*(\d+(?:\.\d+)?)%/);if(m){policy.BOJ.rate=Number(m[1]);policy.BOJ.displayRate=`${Number(m[1]).toFixed(2)}%`;policy.BOJ.asOf=ymd(today)}}catch(e){console.warn('BOJ policy fetch failed:',e.message)}
try{const t=clean(await text('https://www.bankofengland.co.uk/monetary-policy/the-interest-rate-bank-rate'));const m=t.match(/Current Bank Rate\s*(\d+(?:\.\d+)?)%/i);if(m){policy.BOE.rate=Number(m[1]);policy.BOE.displayRate=`${Number(m[1]).toFixed(2)}%`;policy.BOE.asOf=ymd(today)}}catch(e){console.warn('BOE policy fetch failed:',e.message)}
try{const t=clean(await text('https://www.cbc.gov.tw/tw/mp-1.html'));const m=t.match(/重貼現率[^%]{0,80}?(\d+(?:\.\d+)?)%/);if(m){policy.CBC.rate=Number(m[1]);policy.CBC.displayRate=`${Number(m[1]).toFixed(2)}%`;policy.CBC.asOf=ymd(today)}}catch(e){console.warn('CBC policy fetch failed:',e.message)}
try{const j=await json('https://api.hkma.gov.hk/public/market-data-and-statistics/monthly-statistical-bulletin/monetary-operation/disc-win-liquid-adj-win-rates-daily?offset=0');const recs=j?.result?.records||j?.result?.data||[];const r=Array.isArray(recs)?recs[0]:null;const v=num(r?.disc_win_base_rate);if(v!=null){policy.HKMA.rate=v;policy.HKMA.displayRate=`${v.toFixed(2)}%`;policy.HKMA.asOf=r?.end_of_day||ymd(today)}}catch(e){console.warn('HKMA policy fetch failed:',e.message)}

const policyRates=Object.values(policy);
const out={meta:{source:'Official central banks + U.S. Department of the Treasury',mode:'OFFICIAL / OFFICIAL DAILY',realtime:false,asOf:latest.date,generatedAt:new Date().toISOString(),treasuryEndpoint,note:'Policy rates are refreshed from official central-bank/public pages when parsable; conservative last-known official values are retained if a source page is temporarily unavailable. Fed is shown as the target range; ECB uses the deposit facility; CBC uses the discount rate; PBOC uses 1Y LPR.'},policyRates,ust:curve};
await fs.mkdir('data',{recursive:true});
await fs.writeFile('data/rates-latest.json',JSON.stringify(out,null,2)+'\n');
console.log('Wrote data/rates-latest.json',latest.date);
for(const x of policyRates)console.log(x.name,x.displayRate,'next',x.next,x.source);
console.log(curve.map(x=>`${x.tenor}:${x.yield}`).join(' '));
