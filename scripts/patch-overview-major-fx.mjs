import fs from 'node:fs/promises';

let p=await fs.readFile('providers.js','utf8');
let app=await fs.readFile('app.js','utf8');

const mergeFn="function mergeMajorFx(data,fx){if(!Array.isArray(data?.fx)||!Array.isArray(fx?.quotes))return data;data.fxMeta=fx.meta||null;for(const q of fx.quotes){const row=data.fx.find(x=>x.pair===q.pair);if(!row)continue;if(q.bid!=null&&q.ask!=null){row.bid=q.bid;row.ask=q.ask;row.change=q.change??null;row.pct=q.pct??null;row.source=q.source||fx.meta?.source||'FX web quote';row.quoteMode=q.mode||fx.meta?.quoteMode||'PUBLIC WEB QUOTE';row.quoteTime=q.time||fx.meta?.generatedAt||null}row.p1m=q.p1m??'—';row.p3m=q.p3m??'—';row.p6m=q.p6m??'—';row.p1y=q.p1y??'—';row.forwardSource=q.forwardSource||fx.meta?.forwardSource||null;row.forwardMode=q.forwardMode||null;row.forwards=q.forwards||{}}return data}";
const twdFn="function mergeUsdtwd(data,fx){const s=fx?.spot;if(!data?.twd||!s||s.bid==null||s.ask==null)return data;data.twd.spotBid=s.bid;data.twd.spotAsk=s.ask;const top=Array.isArray(data.top)?data.top.find(x=>x.id==='USDTWD'):null;if(top)top.value=s.mid??((s.bid+s.ask)/2);return data}";

if(/function mergeMajorFx\([^]*?return data\}/.test(p))p=p.replace(/function mergeMajorFx\([^]*?return data\}/,mergeFn);
else p=p.replace('function localLiveEndpoint(){',mergeFn+twdFn+'function localLiveEndpoint(){');
if(!p.includes('function mergeUsdtwd('))p=p.replace('function localLiveEndpoint(){',twdFn+'function localLiveEndpoint(){');

p=p.replace(/const \[base,taifex,delayed,fxTwd,live\]=await Promise\.all\(\[fetchJson\(endpoint,true\),fetchJson\('\.\/data\/taifex-latest\.json',false\),fetchJson\('\.\/data\/overseas-delayed\.json',false\),fetchJson\('\.\/data\/usdtwd-fx\.json',false\),fetchJson\(localLiveEndpoint\(\)\|\|c\.liveEndpoint,false\)\]\);mergeTaifex\(base,taifex\);mergeDelayed\(base,delayed\);base\.usdtwdFx=fxTwd\|\|null;/,
"const [base,taifex,delayed,fxTwd,majorFx,live]=await Promise.all([fetchJson(endpoint,true),fetchJson('./data/taifex-latest.json',false),fetchJson('./data/overseas-delayed.json',false),fetchJson('./data/usdtwd-fx.json',false),fetchJson('./data/fx-latest.json',false),fetchJson(localLiveEndpoint()||c.liveEndpoint,false)]);mergeTaifex(base,taifex);mergeDelayed(base,delayed);mergeMajorFx(base,majorFx);mergeUsdtwd(base,fxTwd);base.usdtwdFx=fxTwd||null;");

const fmtAnchor="const fmt=(v,d=2)=>Number(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});\n";
if(!app.includes('const fxPoint2='))app=app.replace(fmtAnchor,fmtAnchor+"const fxPoint2=v=>{const x=Number(v);return Number.isFinite(x)?x.toFixed(2):'—'};\n");
const rawPoints="<td>${x.p1m}</td><td>${x.p3m}</td><td>${x.p6m}</td><td>${x.p1y}</td>";
const fmtPoints="<td>${fxPoint2(x.p1m)}</td><td>${fxPoint2(x.p3m)}</td><td>${fxPoint2(x.p6m)}</td><td>${fxPoint2(x.p1y)}</td>";
if(app.includes(rawPoints))app=app.replace(rawPoints,fmtPoints);

if(!p.includes("fetchJson('./data/fx-latest.json',false)"))throw new Error('major FX fetch patch failed');
if(!p.includes('mergeMajorFx(base,majorFx)'))throw new Error('major FX merge patch failed');
if(!app.includes('fxPoint2(x.p1m)'))throw new Error('overview FX 2-decimal formatter patch failed');
await fs.writeFile('providers.js',p);
await fs.writeFile('app.js',app);
console.log('Overview major FX spot + forward bridge installed; swap points formatted to 2 decimals.');
