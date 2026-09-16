import fs from 'node:fs/promises';

let p=await fs.readFile('providers.js','utf8');

const mergeFn=`function mergeOverviewCommodities(data,d){if(!Array.isArray(data?.commodities)||!d?.commodities)return data;data.commodityOverviewMeta=d.meta||null;const maps={'黃金':'GOLD','白銀':'SILVER','WTI 原油':'WTI','Brent 原油':'BRENT','銅':'COPPER','天然氣':'NATGAS'};for(const row of data.commodities){const id=maps[row.name],q=id?d.commodities[id]:null;if(!q)continue;row.spot=q.spot?.last??null;row.future=q.future?.last??null;row.basis=row.spot!=null&&row.future!=null?row.future-row.spot:null;row.pct=q.spot?.pct??null;row.spotSource=q.spot?.source||null;row.spotQuoteMode=q.spot?.mode||null;row.spotTimestamp=q.spot?.timestamp||null;row.futureSource=q.future?.source||null;row.futureQuoteMode=q.future?.mode||null;row.futureTimestamp=q.future?.timestamp||null;row.futureCode=q.futureCode||row.futureCode;const top=Array.isArray(data.top)?data.top.find(x=>x.id===id):null;if(top&&row.spot!=null){top.value=row.spot;top.change=q.spot?.change??0;top.pct=q.spot?.pct??null}}return data}`;

if(p.includes('function mergeOverviewCommodities(')){
  p=p.replace(/function mergeOverviewCommodities\(data,d\)\{[\s\S]*?return data\}/,mergeFn);
}else p=p.replace('function localLiveEndpoint(){',mergeFn+'function localLiveEndpoint(){');

if(!p.includes("fetchJson('./data/commodities-latest.json',false)")){
  p=p.replace(
    "const [base,taifex,delayed,fxTwd,majorFx,live]=await Promise.all([fetchJson(endpoint,true),fetchJson('./data/taifex-latest.json',false),fetchJson('./data/overseas-delayed.json',false),fetchJson('./data/usdtwd-fx.json',false),fetchJson('./data/fx-latest.json',false),fetchJson(localLiveEndpoint()||c.liveEndpoint,false)]);",
    "const [base,taifex,delayed,fxTwd,majorFx,commodityData,live]=await Promise.all([fetchJson(endpoint,true),fetchJson('./data/taifex-latest.json',false),fetchJson('./data/overseas-delayed.json',false),fetchJson('./data/usdtwd-fx.json',false),fetchJson('./data/fx-latest.json',false),fetchJson('./data/commodities-latest.json',false),fetchJson(localLiveEndpoint()||c.liveEndpoint,false)]);"
  );
}

if(!p.includes('mergeOverviewCommodities(base,commodityData)')){
  if(p.includes('mergeOverviewEquities(base,delayed,taifex);'))p=p.replace('mergeOverviewEquities(base,delayed,taifex);','mergeOverviewEquities(base,delayed,taifex);mergeOverviewCommodities(base,commodityData);');
  else p=p.replace('mergeMajorFx(base,majorFx);','mergeOverviewCommodities(base,commodityData);mergeMajorFx(base,majorFx);');
}

if(!p.includes("fetchJson('./data/commodities-latest.json',false)"))throw new Error('commodity data fetch patch failed');
if(!p.includes('mergeOverviewCommodities(base,commodityData)'))throw new Error('commodity merge patch failed');
if(!p.includes("'天然氣':'NATGAS'"))throw new Error('commodity map patch failed');
await fs.writeFile('providers.js',p);
console.log('Overview commodity spot + futures bridge installed.');
