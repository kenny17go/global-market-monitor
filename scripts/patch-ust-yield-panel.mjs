import fs from 'node:fs/promises';

let index=await fs.readFile('index.html','utf8');
let app=await fs.readFile('app.js','utf8');
let styles=await fs.readFile('styles.css','utf8');

const oldPanel='<article class="panel"><h3>美國公債利率 / UST Yield Curve <small>Daily</small></h3><div class="curve"><canvas id="yieldCanvas" class="chart-canvas"></canvas></div></article>';
const newPanel='<article class="panel ust-yield-panel"><h3><span>美國公債利率 / UST Yield Curve</span><small id="ustYieldStatus">OFFICIAL DAILY</small></h3><div class="ust-yield-meta" id="ustYieldMeta">資料載入中…</div><div class="curve ust-yield-chart"><canvas id="yieldCanvas" class="chart-canvas"></canvas></div><div class="ust-yield-table-wrap"><table class="ust-yield-table"><thead><tr id="ustYieldTenors"></tr></thead><tbody><tr id="ustYieldValues"></tr></tbody></table></div><div class="ust-yield-spreads"><div><span>10Y − 2Y</span><b id="ustSpread102">—</b></div><div><span>30Y − 5Y</span><b id="ustSpread305">—</b></div></div></article>';
if(!index.includes('id="ustYieldValues"')){
  if(!index.includes(oldPanel))throw new Error('UST panel anchor not found');
  index=index.replace(oldPanel,newPanel);
}

const oldRender="function renderYield(){drawLine($('#yieldCanvas'),DATA.ust.map(x=>x.yield),{color:'#56aef7'})}";
const newRender=`function renderYield(){
  const rows=Array.isArray(DATA?.ust)?DATA.ust.filter(x=>Number.isFinite(Number(x.yield))):[];
  const canvas=$('#yieldCanvas');
  if(!canvas||rows.length<2)return;
  const dpr=devicePixelRatio||1,w=Math.max(canvas.clientWidth||320,280),h=Math.max(canvas.clientHeight||180,170);
  canvas.width=w*dpr;canvas.height=h*dpr;
  const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  const vals=rows.map(x=>Number(x.yield)),min=Math.min(...vals),max=Math.max(...vals),range=max-min||0.5;
  const step=Math.max(0.1,Math.ceil((range/4)*10)/10),lo=Math.floor((min-step)*10)/10,hi=Math.ceil((max+step)*10)/10;
  const left=42,right=10,top=12,bottom=30,pw=w-left-right,ph=h-top-bottom;
  c.font='10px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif';c.textBaseline='middle';c.lineWidth=1;
  const ticks=4;
  for(let i=0;i<=ticks;i++){
    const v=lo+(hi-lo)*i/ticks,y=top+ph-(ph*i/ticks);
    c.strokeStyle='#173b58';c.beginPath();c.moveTo(left,y);c.lineTo(w-right,y);c.stroke();
    c.fillStyle='#8da7bc';c.textAlign='right';c.fillText(v.toFixed(2)+'%',left-6,y);
  }
  c.strokeStyle='#2b5877';c.beginPath();c.moveTo(left,top);c.lineTo(left,top+ph);c.lineTo(w-right,top+ph);c.stroke();
  const pts=rows.map((r,i)=>({x:left+(rows.length===1?pw/2:i/(rows.length-1)*pw),y:top+ph-((Number(r.yield)-lo)/(hi-lo))*ph,r}));
  c.strokeStyle='#56aef7';c.lineWidth=2;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();
  pts.forEach(p=>{
    c.fillStyle='#56aef7';c.beginPath();c.arc(p.x,p.y,3,0,Math.PI*2);c.fill();
    c.fillStyle='#cfe9fb';c.textAlign='center';c.textBaseline='bottom';c.fillText(Number(p.r.yield).toFixed(2)+'%',p.x,p.y-6);
    c.fillStyle='#8da7bc';c.textBaseline='top';c.fillText(p.r.tenor,p.x,top+ph+8);
  });
  const tenors=$('#ustYieldTenors'),values=$('#ustYieldValues');
  if(tenors)tenors.innerHTML=rows.map(x=>'<th>'+x.tenor+'</th>').join('');
  if(values)values.innerHTML=rows.map(x=>'<td>'+Number(x.yield).toFixed(2)+'%</td>').join('');
  const byTenor=Object.fromEntries(rows.map(x=>[x.tenor,Number(x.yield)]));
  const s102=Number.isFinite(byTenor['10Y'])&&Number.isFinite(byTenor['2Y'])?byTenor['10Y']-byTenor['2Y']:null;
  const s305=Number.isFinite(byTenor['30Y'])&&Number.isFinite(byTenor['5Y'])?byTenor['30Y']-byTenor['5Y']:null;
  if($('#ustSpread102'))$('#ustSpread102').textContent=s102==null?'—':(s102>=0?'+':'')+s102.toFixed(2)+'%';
  if($('#ustSpread305'))$('#ustSpread305').textContent=s305==null?'—':(s305>=0?'+':'')+s305.toFixed(2)+'%';
  const meta=DATA?.ratesOverviewMeta||{};
  if($('#ustYieldStatus'))$('#ustYieldStatus').textContent=meta.mode||'OFFICIAL DAILY';
  if($('#ustYieldMeta')){
    const date=meta.asOf?new Date(meta.asOf).toLocaleDateString('zh-TW',{year:'numeric',month:'2-digit',day:'2-digit'}):'—';
    $('#ustYieldMeta').textContent='Source: '+(meta.source||'U.S. Department of the Treasury')+' · As of: '+date;
  }
}`;
if(!app.includes('id="ustYieldValues"')&&!app.includes("const tenors=$('#ustYieldTenors')")){
  if(!app.includes(oldRender))throw new Error('renderYield anchor not found');
  app=app.replace(oldRender,newRender);
}

const css=`\n/* ust-yield-panel */\n.ust-yield-panel h3{gap:8px}.ust-yield-meta{padding:7px 10px 0;color:var(--muted);font-size:10px}.ust-yield-chart{height:205px;padding:8px 8px 0}.ust-yield-chart .chart-canvas{height:185px}.ust-yield-table-wrap{overflow-x:auto;padding:0 8px 8px}.ust-yield-table{table-layout:fixed;min-width:420px;border:1px solid var(--line);border-radius:7px;overflow:hidden}.ust-yield-table th,.ust-yield-table td{text-align:center!important;padding:6px 5px}.ust-yield-table th{position:static;background:#0d2134;color:#9fb7c9}.ust-yield-table td{font-weight:700;color:#dcecf8}.ust-yield-spreads{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:0 8px 8px}.ust-yield-spreads>div{display:flex;justify-content:space-between;align-items:center;border:1px solid var(--line);border-radius:7px;background:#081827;padding:7px 9px}.ust-yield-spreads span{color:var(--muted);font-size:10px}.ust-yield-spreads b{font-size:12px;color:#cfe9fb}@media(max-width:800px){.ust-yield-chart{height:190px}.ust-yield-chart .chart-canvas{height:170px}}\n`;
if(!styles.includes('/* ust-yield-panel */'))styles+=css;

await Promise.all([
  fs.writeFile('index.html',index),
  fs.writeFile('app.js',app),
  fs.writeFile('styles.css',styles)
]);
console.log('UST yield chart axes + tenor table installed.');
