import fs from 'node:fs/promises';

let app=await fs.readFile('app.js','utf8');
let index=await fs.readFile('index.html','utf8');

if(!app.includes('const SETTLEMENT_NDF_FORMULA_TOKENS=')){
  app=app.replace(
    'function quoteTokenMap(){',
    "const SETTLEMENT_NDF_FORMULA_TOKENS={TGF_NEAR_NDF:null,TGF_NEXT_NDF:null,BRF_NEAR_NDF:null,BRF_NEXT_NDF:null};\nfunction quoteTokenMap(){"
  );
}

app=app.replace(
  /function quoteTokenMap\(\)\{const m=\{USD_TWD_SPOT:DATA\?\.twd\?\.spotBid\};(?!Object\.assign\(m,SETTLEMENT_NDF_FORMULA_TOKENS\);)/,
  'function quoteTokenMap(){const m={USD_TWD_SPOT:DATA?.twd?.spotBid};Object.assign(m,SETTLEMENT_NDF_FORMULA_TOKENS);'
);

if(!app.includes('<optgroup label="結算日 NDF">')){
  app=app.replace(
    '<optgroup label="其他"><option value="USD_TWD_SPOT">USD/TWD Spot</option></optgroup>',
    '<optgroup label="結算日 NDF"><option value="TGF_NEAR_NDF">TGF 近月 NDF Mid</option><option value="TGF_NEXT_NDF">TGF 次月 NDF Mid</option><option value="BRF_NEAR_NDF">BRF 近月 NDF Mid</option><option value="BRF_NEXT_NDF">BRF 次月 NDF Mid</option></optgroup><optgroup label="其他"><option value="USD_TWD_SPOT">USD/TWD Spot</option></optgroup>'
  );
}

if(!app.includes('SETTLEMENT_NDF_FORMULA_TOKENS.TGF_NEAR_NDF=')){
  app=app.replace(
    "const f=v=>v==null?'—':Number(v).toFixed(4);body.innerHTML=rows.map",
    "SETTLEMENT_NDF_FORMULA_TOKENS.TGF_NEAR_NDF=rows.find(r=>r.code==='TGF'&&r.label==='近月')?.q?.mid??null;SETTLEMENT_NDF_FORMULA_TOKENS.TGF_NEXT_NDF=rows.find(r=>r.code==='TGF'&&r.label==='次月')?.q?.mid??null;SETTLEMENT_NDF_FORMULA_TOKENS.BRF_NEAR_NDF=rows.find(r=>r.code==='BRF'&&r.label==='近月')?.q?.mid??null;SETTLEMENT_NDF_FORMULA_TOKENS.BRF_NEXT_NDF=rows.find(r=>r.code==='BRF'&&r.label==='次月')?.q?.mid??null;const f=v=>v==null?'—':Number(v).toFixed(4);body.innerHTML=rows.map"
  );
}

index=index.replace(/app\.js(?:\?v=[^\"']+)?/g,'app.js?v=20260916-ndf4');

await fs.writeFile('app.js',app);
await fs.writeFile('index.html',index);
console.log('Added TGF/BRF near/next settlement NDF tokens to Formula Lab.');