import fs from 'node:fs/promises';

let index=await fs.readFile('index.html','utf8');
let app=await fs.readFile('app.js','utf8');
let styles=await fs.readFile('styles.css','utf8');

const block=`
          <div id="brokenDateForward" class="broken-date-box">
            <div class="broken-date-head">
              <div><b>奇零天期 / Broken Date Forward</b><small>線性插補 Forward Points；只在已有報價節點之間插補，不外推。</small></div>
              <div class="broken-date-controls">
                <select id="brokenDateMarket" aria-label="Market"><option value="onshore">Onshore</option><option value="offshore">Offshore</option></select>
                <label><span>天數</span><input id="brokenDateDays" type="number" min="1" max="365" step="1" value="45" inputmode="numeric"></label>
                <button id="brokenDateCalc" class="secondary-btn" type="button">計算</button>
              </div>
            </div>
            <div id="brokenDateResult" class="broken-date-result"></div>
            <div class="broken-date-note">標準天期採 1W=7、1M=30、3M=90、6M=180、1Y=365 天。若目前 Onshore fallback 僅有 1M/3M/6M，則可插補範圍為 30–180 天。</div>
          </div>`;

index=index.replace(/\s*<div id="brokenDateForward"[\s\S]*?<\/div>\s*<div class="broken-date-note">[\s\S]*?<\/div>/g,'');
index=index.replace(/(\s*<div class="fx-focus-note">)/,`\n${block}\n$1`);

const js=`
const BROKEN_DATE_DAYS={'1W':7,'1M':30,'3M':90,'6M':180,'1Y':365};
function brokenDateFmt(v,n=4){return v==null||!Number.isFinite(Number(v))?'—':Number(v).toFixed(n)}
function brokenDateNodes(bucket){
  if(!bucket?.curve)return [];
  return Object.entries(BROKEN_DATE_DAYS).map(([tenor,days])=>{const q=bucket.curve?.[tenor];if(!q)return null;return {tenor,days,bid:q.bid??null,ask:q.ask??null,mid:q.mid??null,outrightBid:q.outrightBid??null,outrightAsk:q.outrightAsk??null,outrightMid:q.outrightMid??null,spotBid:q.spotBid??null,spotAsk:q.spotAsk??null}}).filter(Boolean).sort((a,b)=>a.days-b.days);
}
function brokenDateLerp(a,b,w){return a==null||b==null?null:Number(a)+(Number(b)-Number(a))*w}
function brokenDateInterpolate(bucket,targetDays,globalSpot){
  const nodes=brokenDateNodes(bucket).filter(n=>n.mid!=null||n.outrightMid!=null);
  if(nodes.length<2)return {error:'可用報價節點不足，至少需要兩個天期。'};
  const lo=nodes.filter(n=>n.days<=targetDays).at(-1),hi=nodes.find(n=>n.days>=targetDays);
  if(!lo||!hi)return {error:`目前只能在 ${nodes[0].days}–${nodes.at(-1).days} 天之間插補，不進行外推。`};
  if(lo.days===hi.days){return {...lo,from:lo.tenor,to:hi.tenor,weight:0,exact:true,quoteType:bucket.quoteType||''};}
  const w=(targetDays-lo.days)/(hi.days-lo.days),out={days:targetDays,from:lo.tenor,to:hi.tenor,weight:w,quoteType:bucket.quoteType||''};
  if(bucket.quoteType==='OUTRIGHT BENCHMARK'){
    out.outrightBid=brokenDateLerp(lo.outrightBid,hi.outrightBid,w);out.outrightAsk=brokenDateLerp(lo.outrightAsk,hi.outrightAsk,w);out.outrightMid=brokenDateLerp(lo.outrightMid,hi.outrightMid,w);
    return out;
  }
  out.bid=brokenDateLerp(lo.bid,hi.bid,w);out.ask=brokenDateLerp(lo.ask,hi.ask,w);out.mid=brokenDateLerp(lo.mid,hi.mid,w);
  const spotBid=lo.spotBid??hi.spotBid??globalSpot?.bid??null,spotAsk=lo.spotAsk??hi.spotAsk??globalSpot?.ask??null;
  const spotMid=spotBid!=null&&spotAsk!=null?(spotBid+spotAsk)/2:(globalSpot?.mid??null);
  out.spotBid=spotBid;out.spotAsk=spotAsk;out.spotMid=spotMid;
  out.outrightBid=out.bid!=null&&spotBid!=null?spotBid+out.bid:null;out.outrightAsk=out.ask!=null&&spotAsk!=null?spotAsk+out.ask:null;out.outrightMid=out.mid!=null&&spotMid!=null?spotMid+out.mid:null;
  return out;
}
function renderBrokenDateForward(){
  const host=$('#brokenDateResult'),marketEl=$('#brokenDateMarket'),daysEl=$('#brokenDateDays');if(!host||!marketEl||!daysEl)return;
  const p=DATA?.usdtwdFx,market=marketEl.value,days=Math.round(Number(daysEl.value));
  if(!p||!Number.isFinite(days)||days<1){host.innerHTML='<div class="broken-date-error">請輸入有效天數。</div>';return;}
  const bucket=market==='offshore'?p.offshore:p.onshore,res=brokenDateInterpolate(bucket,days,p.spot);
  if(res.error){host.innerHTML=`<div class="broken-date-error">${res.error}</div>`;return;}
  const src=bucket?.source||'—',range=res.exact?res.from:`${res.from} → ${res.to}`,pct=res.exact?'標準天期':`${(res.weight*100).toFixed(1)}%`;
  host.innerHTML=`<div class="broken-date-card"><span>來源 / 節點</span><b>${src}</b><small>${range} · ${pct}</small></div><div class="broken-date-card"><span>Swap Point Bid / Ask</span><b>${brokenDateFmt(res.bid)} / ${brokenDateFmt(res.ask)}</b><small>Mid ${brokenDateFmt(res.mid)}</small></div><div class="broken-date-card"><span>Outright Bid / Ask</span><b>${brokenDateFmt(res.outrightBid)} / ${brokenDateFmt(res.outrightAsk)}</b><small>Mid ${brokenDateFmt(res.outrightMid)}</small></div>`;
}
function bindBrokenDateForward(){const btn=$('#brokenDateCalc'),days=$('#brokenDateDays'),market=$('#brokenDateMarket');if(btn&&!btn.dataset.bound){btn.dataset.bound='1';btn.addEventListener('click',renderBrokenDateForward)}if(days&&!days.dataset.bound){days.dataset.bound='1';days.addEventListener('change',renderBrokenDateForward);days.addEventListener('keydown',e=>{if(e.key==='Enter')renderBrokenDateForward()})}if(market&&!market.dataset.bound){market.dataset.bound='1';market.addEventListener('change',renderBrokenDateForward)}renderBrokenDateForward()}
`;

if(!app.includes('function brokenDateInterpolate('))app=app.replace('function renderUsdtwdFx(){',js+'\nfunction renderUsdtwdFx(){');
app=app.replace(/function renderUsdtwdFx\(\)\{syncUsdtwdVisibility\(\);/,"function renderUsdtwdFx(){syncUsdtwdVisibility();");
app=app.replace(/(\$\('#usdtwdFxFreshness'\)\.textContent=[^}]+\})/,m=>m.replace(/\}$/,";bindBrokenDateForward()}"));

const css=`
.broken-date-box{margin:12px;border:1px solid var(--line);border-radius:9px;background:#071827;overflow:hidden}.broken-date-head{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:11px 12px;border-bottom:1px solid var(--line)}.broken-date-head>div:first-child{display:grid;gap:3px}.broken-date-head small,.broken-date-note,.broken-date-card small{color:var(--muted);font-size:10px}.broken-date-controls{display:flex;gap:8px;align-items:end}.broken-date-controls select,.broken-date-controls input{background:#06131f;color:var(--text);border:1px solid var(--line);border-radius:6px;padding:6px 8px;font-size:11px}.broken-date-controls label{display:grid;gap:2px;color:var(--muted);font-size:9px}.broken-date-controls input{width:78px}.broken-date-result{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:8px;padding:10px 12px}.broken-date-card{border:1px solid var(--line);border-radius:7px;padding:9px;display:grid;gap:4px}.broken-date-card span{color:var(--muted);font-size:10px}.broken-date-card b{font-size:14px}.broken-date-error{grid-column:1/-1;color:#f6b66b;padding:8px 2px;font-size:11px}.broken-date-note{padding:0 12px 10px}@media(max-width:700px){.broken-date-head{align-items:stretch;flex-direction:column}.broken-date-controls{display:grid;grid-template-columns:1fr 1fr auto}.broken-date-controls input{width:100%;box-sizing:border-box}.broken-date-result{grid-template-columns:1fr}}
`;
if(!styles.includes('.broken-date-box{'))styles+='\n'+css;

await fs.writeFile('index.html',index);await fs.writeFile('app.js',app);await fs.writeFile('styles.css',styles);
console.log('Broken-date forward interpolation UI installed.');
