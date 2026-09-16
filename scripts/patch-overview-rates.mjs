import fs from 'node:fs/promises';

let p=await fs.readFile('providers.js','utf8');
const mergeFn=`function mergeOverviewRates(data,ratesData){if(!data||!ratesData)return data;data.ratesOverviewMeta=ratesData.meta||null;if(Array.isArray(ratesData.ust)&&ratesData.ust.length)data.ust=ratesData.ust.map(x=>({tenor:x.tenor,yield:x.yield}));return data}`;

if(!p.includes('function mergeOverviewRates('))p=p.replace('function localLiveEndpoint(){',mergeFn+'function localLiveEndpoint(){');

if(!p.includes("fetchJson('./data/rates-latest.json',false)")){
  p=p.replace(
    "const [base,taifex,delayed,fxTwd,majorFx,commodityData,live]=await Promise.all([fetchJson(endpoint,true),fetchJson('./data/taifex-latest.json',false),fetchJson('./data/overseas-delayed.json',false),fetchJson('./data/usdtwd-fx.json',false),fetchJson('./data/fx-latest.json',false),fetchJson('./data/commodities-latest.json',false),fetchJson(localLiveEndpoint()||c.liveEndpoint,false)]);",
    "const [base,taifex,delayed,fxTwd,majorFx,commodityData,ratesData,live]=await Promise.all([fetchJson(endpoint,true),fetchJson('./data/taifex-latest.json',false),fetchJson('./data/overseas-delayed.json',false),fetchJson('./data/usdtwd-fx.json',false),fetchJson('./data/fx-latest.json',false),fetchJson('./data/commodities-latest.json',false),fetchJson('./data/rates-latest.json',false),fetchJson(localLiveEndpoint()||c.liveEndpoint,false)]);"
  );
}

if(!p.includes('mergeOverviewRates(base,ratesData)')){
  if(p.includes('mergeOverviewCommodities(base,commodityData);'))p=p.replace('mergeOverviewCommodities(base,commodityData);','mergeOverviewCommodities(base,commodityData);mergeOverviewRates(base,ratesData);');
  else p=p.replace('mergeMajorFx(base,majorFx);','mergeOverviewRates(base,ratesData);mergeMajorFx(base,majorFx);');
}

if(!p.includes("fetchJson('./data/rates-latest.json',false)"))throw new Error('rates data fetch patch failed');
if(!p.includes('mergeOverviewRates(base,ratesData)'))throw new Error('rates merge patch failed');
await fs.writeFile('providers.js',p);
console.log('Overview rates / UST bridge installed.');
