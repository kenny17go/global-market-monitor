import fs from 'node:fs/promises';

const UA='Mozilla/5.0 global-market-monitor/1.0';
const year=new Date().getUTCFullYear();
const endpoint=`https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value=${year}`;

const r=await fetch(endpoint,{headers:{'user-agent':UA,'accept':'application/atom+xml,application/xml,text/xml,*/*'},redirect:'follow',signal:AbortSignal.timeout(20000)});
if(!r.ok)throw new Error(`US Treasury HTTP ${r.status}`);
const xml=await r.text();

const entries=[...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m=>m[1]);
const field=(s,name)=>{const m=s.match(new RegExp(`<d:${name}[^>]*>([^<]+)<\\/d:${name}>`,'i'));return m?m[1].trim():null};
const dateOf=s=>field(s,'NEW_DATE')||field(s,'NEW_DATE_VALUE');
const rows=entries.map(s=>({date:dateOf(s),raw:s})).filter(x=>x.date).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
const latest=rows.at(-1);
if(!latest)throw new Error('No Treasury yield curve rows found');

const map=[
  ['1M','BC_1MONTH'],['3M','BC_3MONTH'],['6M','BC_6MONTH'],['1Y','BC_1YEAR'],
  ['2Y','BC_2YEAR'],['5Y','BC_5YEAR'],['10Y','BC_10YEAR'],['30Y','BC_30YEAR']
];
const curve=map.map(([tenor,key])=>{const v=Number(field(latest.raw,key));return {tenor,yield:Number.isFinite(v)?v:null}});
if(curve.filter(x=>x.yield!=null).length<6)throw new Error('Incomplete Treasury curve');

const out={meta:{source:'U.S. Department of the Treasury',mode:'OFFICIAL DAILY',realtime:false,asOf:latest.date,generatedAt:new Date().toISOString(),endpoint},ust:curve};
await fs.mkdir('data',{recursive:true});
await fs.writeFile('data/rates-latest.json',JSON.stringify(out,null,2)+'\n');
console.log('Wrote data/rates-latest.json',latest.date,curve.map(x=>`${x.tenor}:${x.yield}`).join(' '));
