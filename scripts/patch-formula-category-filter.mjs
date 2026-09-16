import fs from 'node:fs/promises';

let index=await fs.readFile('index.html','utf8');
let app=await fs.readFile('app.js','utf8');

if(!index.includes('id="tokenCategory"')){
  index=index.replace(
    '<div class="formula-tools">\n            <select id="tokenSelect"><option value="">選擇報價欄位…</option></select><button id="insertToken">插入欄位</button>',
    '<div class="formula-tools">\n            <select id="tokenCategory" aria-label="產品類別"><option value="all">全部產品</option><option value="台灣指數">台灣指數</option><option value="股價指數">股價指數</option><option value="匯率">匯率</option><option value="貴金屬">貴金屬</option><option value="能源">能源</option><option value="結算日NDF">結算日 NDF</option></select>\n            <select id="tokenSelect"><option value="">選擇報價欄位…</option></select><button id="insertToken">插入欄位</button>'
  );
}

const newRenderer=`function renderTokenOptions(){
  const s=$('#tokenSelect');if(!s)return;
  const filter=$('#tokenCategory')?.value||'all',cur=s.value,groups={};
  const add=(g,label,id)=>{groups[g]??=[];groups[g].push({label,id})};
  catalogRows().forEach(x=>{
    const addTw=()=>add(x.category,\`${'${x.name}'}｜${'${x.tw.exchange}'} ${'${x.tw.code}'}\`,x.tw.id);
    const addOs=()=>add(x.category,\`${'${x.name}'}｜${'${x.os.exchange}'} ${'${x.os.code}'}\`,x.os.id);
    if(filter==='all'){addTw();addOs();return}
    if(filter==='台灣指數'&&x.category==='股價指數'){addTw();return}
    if(filter==='股價指數'&&x.category==='股價指數'){addOs();return}
    if(filter==='匯率'&&x.category==='外匯'){addTw();addOs();return}
    if(filter===x.category){addTw();addOs()}
  });
  let html='<option value="">選擇報價欄位…</option>';
  html+=Object.entries(groups).map(([g,arr])=>\`<optgroup label="${'${g}'}">${'${arr.map(q=>[\'BID\',\'ASK\',\'LAST\'].map(f=>`<option value="${q.id}.${f}">${q.label} · ${f}</option>`).join(\'\')).join(\'\')}'} </optgroup>\`).join('');
  if(filter==='all'||filter==='結算日NDF')html+='<optgroup label="結算日 NDF"><option value="TGF_NEAR_NDF">TGF 近月 NDF Mid</option><option value="TGF_NEXT_NDF">TGF 次月 NDF Mid</option><option value="BRF_NEAR_NDF">BRF 近月 NDF Mid</option><option value="BRF_NEXT_NDF">BRF 次月 NDF Mid</option></optgroup>';
  if(filter==='all'||filter==='匯率')html+='<optgroup label="匯率"><option value="USD_TWD_SPOT">USD/TWD Spot</option></optgroup>';
  s.innerHTML=html.replace(/>\s+<\/optgroup>/g,'></optgroup>');
  if([...s.options].some(o=>o.value===cur))s.value=cur;
}`;

app=app.replace(/function renderTokenOptions\(\)\{[\s\S]*?\nfunction evalMarketFormula\(/,newRenderer+'\nfunction evalMarketFormula(');

if(!app.includes("$('#tokenCategory').onchange=renderTokenOptions")){
  app=app.replace("if($('#catalogFilter'))$('#catalogFilter').onchange=renderCatalog;","if($('#catalogFilter'))$('#catalogFilter').onchange=renderCatalog;if($('#tokenCategory'))$('#tokenCategory').onchange=renderTokenOptions;");
}

index=index.replace(/app\.js\?v=[^\"']+/,'app.js?v=20260916-formula-cat1');

await fs.writeFile('index.html',index);
await fs.writeFile('app.js',app);
console.log('Formula Lab product category filter installed.');
