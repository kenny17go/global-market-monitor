// Global Market Monitor v1.5 — dynamic contract month generator + matcher
(function(){
  const Q=[3,6,9,12];
  const EVEN=[2,4,6,8,10,12];
  const pad=n=>String(n).padStart(2,'0');
  const ym=(y,m)=>`${y}${pad(m)}`;
  const label=s=>`${s.slice(0,4)}/${s.slice(4)}`;
  const monthIndex=(y,m)=>y*12+(m-1);
  const fromIndex=i=>({y:Math.floor(i/12),m:(i%12)+1});
  const addM=(y,m,n)=>fromIndex(monthIndex(y,m)+n);
  const nthWeekday=(y,m,weekday,n)=>{const d=new Date(y,m-1,1);const shift=(weekday-d.getDay()+7)%7;return new Date(y,m-1,1+shift+(n-1)*7)};
  const thirdFri=(y,m)=>nthWeekday(y,m,5,3);
  const secondFri=(y,m)=>nthWeekday(y,m,5,2);
  const prevBizDay=d=>{const x=new Date(d);x.setDate(x.getDate()-1);while(x.getDay()===0||x.getDay()===6)x.setDate(x.getDate()-1);return x};
  const secondBizBeforeThirdWed=(y,m)=>{let d=nthWeekday(y,m,3,3),c=0;while(c<2){d.setDate(d.getDate()-1);if(d.getDay()!==0&&d.getDay()!==6)c++;}return d};
  const endOfMonth=(y,m)=>new Date(y,m,0,23,59,59);
  const now=()=>new Date();
  const currentYM=()=>({y:now().getFullYear(),m:now().getMonth()+1});
  const isExpired=(id,y,m,dt=now())=>{
    let ltd=null;
    if(/^TAIFEX_(SPF|UNF|UDF|SXF|F1F)$/.test(id)||/^(CME_ES|CME_NQ|CBOT_YM|CME_SOX|ICE_Z)$/.test(id)) ltd=thirdFri(y,m);
    else if(id==='TAIFEX_TJF') ltd=prevBizDay(secondFri(y,m));
    else if(id==='JPX_TOPIX') ltd=secondFri(y,m);
    else if(/^TAIFEX_(RHF)$/.test(id)) ltd=secondBizBeforeThirdWed(y,m);
    else if(/^TAIFEX_(XEF|XJF|XBF|XAF)$/.test(id)||/^CME_(CNH|6E|6J|6B|6A)$/.test(id)) ltd=thirdFri(y,m);
    else if(/^TAIFEX_(GDF|TGF)$/.test(id)||/^(COMEX_GC|COMEX_GC_TWD)$/.test(id)) ltd=endOfMonth(y,m);
    else if(/^(TAIFEX_BRF|ICE_BRENT)$/.test(id)) ltd=endOfMonth(y,m);
    if(!ltd)return false;
    return dt>ltd;
  };
  function quarters(count,id){
    const {y,m}=currentYM(); const out=[];
    for(let k=0;k<36&&out.length<count;k++){
      const a=addM(y,m,k); if(!Q.includes(a.m))continue; if(isExpired(id,a.y,a.m))continue; out.push(ym(a.y,a.m));
    } return out;
  }
  function spotNextQuarter(qCount,id){
    const {y,m}=currentYM(); const out=[]; let start=0;
    if(isExpired(id,y,m))start=1;
    for(let k=start;k<24&&out.length<2;k++){const a=addM(y,m,k);const v=ym(a.y,a.m);if(!out.includes(v))out.push(v)}
    const q=quarters(qCount,id);q.forEach(v=>{if(!out.includes(v))out.push(v)});return out;
  }
  function evenMonths(count,id){
    const {y,m}=currentYM();const out=[];
    for(let k=0;k<30&&out.length<count;k++){const a=addM(y,m,k);if(!EVEN.includes(a.m))continue;if(isExpired(id,a.y,a.m))continue;out.push(ym(a.y,a.m));}
    return out;
  }
  function brentMonths(id){
    const {y,m}=currentYM();const out=[];let start=isExpired(id,y,m)?1:0;
    for(let k=start;k<3+start;k++){const a=addM(y,m,k);out.push(ym(a.y,a.m));}
    for(let k=0;k<30&&out.length<5;k++){const a=addM(y,m,k);if(![6,12].includes(a.m))continue;const v=ym(a.y,a.m);if(!out.includes(v))out.push(v)}
    return out;
  }
  function monthly(count,id){
    const {y,m}=currentYM();const out=[];let start=isExpired(id,y,m)?1:0;
    for(let k=start;k<start+count;k++){const a=addM(y,m,k);out.push(ym(a.y,a.m));}return out;
  }
  function monthsFor(id){
    const s=window.GMM_CONTRACT_SPECS?.[id]; if(!s)return [];
    if(['TAIFEX_SPF','TAIFEX_UNF'].includes(id))return quarters(5,id);
    if(['TAIFEX_UDF','TAIFEX_SXF','TAIFEX_F1F'].includes(id))return quarters(4,id);
    if(['CME_ES','CME_NQ','CBOT_YM','CME_SOX','ICE_Z'].includes(id))return quarters(8,id);
    if(id==='TAIFEX_TJF')return spotNextQuarter(3,id).slice(0,5);
    if(id==='JPX_TOPIX')return quarters(12,id);
    if(id==='TAIFEX_RHF')return spotNextQuarter(4,id).slice(0,6);
    if(id==='CME_CNH')return monthly(13,id).concat(quarters(8,id).filter(x=>!monthly(13,id).includes(x))).slice(0,21);
    if(['TAIFEX_XEF','TAIFEX_XJF','TAIFEX_XBF','TAIFEX_XAF'].includes(id))return quarters(4,id);
    if(['CME_6E','CME_6J','CME_6B','CME_6A'].includes(id))return quarters(8,id);
    if(['TAIFEX_GDF','TAIFEX_TGF'].includes(id))return evenMonths(6,id);
    if(['COMEX_GC','COMEX_GC_TWD'].includes(id))return monthly(6,id).concat(evenMonths(10,id).filter(x=>!monthly(6,id).includes(x))).slice(0,12);
    if(id==='TAIFEX_BRF')return brentMonths(id);
    if(id==='ICE_BRENT')return monthly(18,id);
    return [];
  }
  function distance(a,b){return Math.abs((+a.slice(0,4)*12 + +a.slice(4,6))-(+b.slice(0,4)*12 + +b.slice(4,6)))}
  function bestPair(tw,os){
    const exact=tw.find(x=>os.includes(x)); if(exact)return {tw:exact,os:exact,exact:true,gap:0};
    let best=null; tw.forEach(a=>os.forEach(b=>{const g=distance(a,b);if(!best||g<best.gap)best={tw:a,os:b,exact:false,gap:g}}));return best;
  }
  function replaceInputWithSelect(id){
    const old=document.getElementById(id);if(!old||old.tagName==='SELECT')return old;
    const sel=document.createElement('select');sel.id=id;sel.className=old.className;old.replaceWith(sel);return sel;
  }
  function fillSelect(sel,arr,chosen){
    if(!sel)return;sel.innerHTML=arr.map(v=>`<option value="${v}">${label(v)}</option>`).join('');if(chosen&&arr.includes(chosen))sel.value=chosen;
  }
  function ensureUI(){
    const twSel=replaceInputWithSelect('twExpiry'), osSel=replaceInputWithSelect('osExpiry');
    const lab=document.querySelector('.cost-lab');if(!lab)return;
    if(!document.getElementById('monthMatchSummary')){
      const d=document.createElement('div');d.id='monthMatchSummary';d.className='month-match-summary';
      const spec=document.getElementById('contractSpecSummary');(spec||lab.querySelector('.formula-lab-head')).insertAdjacentElement('afterend',d);
    }
    const footer=document.querySelector('.footer span:first-child');if(footer)footer.textContent='Global Market Monitor v1.5 · GitHub Pages Ready';
    return {twSel,osSel};
  }
  function renderMatch(row,pair,tw,os){
    const el=document.getElementById('monthMatchSummary');if(!el)return;
    const status=pair?.exact?'同月份自動配對':'無完全同月 · 最近月份配對';
    el.innerHTML=`<div class="month-match-card ${pair?.exact?'exact':'near'}"><div><b>合約月份自動配對</b><span class="match-badge">${status}</span></div><div class="month-pair"><span>TAIFEX ${row.tw.code} <strong>${pair?label(pair.tw):'—'}</strong></span><span>↔</span><span>${row.os.exchange} ${row.os.code} <strong>${pair?label(pair.os):'—'}</strong></span></div><small>${pair?.exact?'同一 YYYY/MM；仍須核對實際最後交易時間與結算規則。':`月份相差 ${pair?.gap??'—'} 個月；系統只協助找最近可比合約，不視為等價合約。`}</small><div class="month-list"><span>TAIFEX：${tw.map(label).join(' · ')||'—'}</span><span>海外：${os.slice(0,12).map(label).join(' · ')||'—'}</span></div></div>`;
  }
  function syncMonths(auto=true){
    if(!window.DATA||!window.catalogRows)return;ensureUI();
    const row=catalogRows()[Number(document.getElementById('costProduct')?.value)||0];if(!row)return;
    const tw=monthsFor(row.tw.id),os=monthsFor(row.os.id),pair=bestPair(tw,os);
    const twSel=document.getElementById('twExpiry'),osSel=document.getElementById('osExpiry');
    const keepTw=auto?pair?.tw:twSel?.value, keepOs=auto?pair?.os:osSel?.value;
    fillSelect(twSel,tw,keepTw);fillSelect(osSel,os,keepOs);renderMatch(row,pair,tw,os);
    if(window.calcCostLab)calcCostLab();
  }
  window.GMM_CONTRACT_MONTHS={monthsFor,bestPair,syncMonths};
  function renderCurrent(){
    if(!window.DATA||!window.catalogRows)return;const row=catalogRows()[Number(document.getElementById('costProduct')?.value)||0];if(!row)return;
    const tw=monthsFor(row.tw.id),os=monthsFor(row.os.id);const pair={tw:document.getElementById('twExpiry')?.value,os:document.getElementById('osExpiry')?.value};pair.exact=pair.tw===pair.os;pair.gap=pair.tw&&pair.os?distance(pair.tw,pair.os):null;renderMatch(row,pair,tw,os);
  }
  function hook(){
    ensureUI();
    const product=document.getElementById('costProduct');
    if(product){const prev=product.onchange;product.onchange=function(e){if(prev)prev.call(this,e);setTimeout(()=>syncMonths(true),0)}}
    ['twExpiry','osExpiry'].forEach(id=>{const el=document.getElementById(id);if(el)el.onchange=()=>{renderCurrent();if(window.calcCostLab)calcCostLab()}});
    const reset=document.getElementById('resetCostLab');if(reset){const prev=reset.onclick;reset.onclick=function(e){if(prev)prev.call(this,e);setTimeout(()=>syncMonths(true),0)}}
    setTimeout(()=>syncMonths(true),80);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(hook,250));else setTimeout(hook,250);
})();
