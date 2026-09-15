// Global Market Monitor v1.6.1 - lightweight display precision
// Display-only formatting. Raw numeric values used by calculations are untouched.
(()=>{
  const decimals={SPF:2,ES:2,UNF:0,NQ:2,UDF:0,YM:0,SXF:1,SOX:1,TJF:1,TOPIX:1,F1F:1,Z:1,RHF:4,CNH:4,XEF:4,'6E':4,XJF:2,'6J':6,XBF:4,'6B':4,XAF:4,'6A':4,GDF:1,GC:1,TGF:0,BRF:2,BRENT:2};
  const numeric=s=>Number(String(s??'').replace(/,/g,'').replace(/[^0-9eE+\-.]/g,''));
  const fmt=(value,d=2)=>{const n=numeric(value);if(!Number.isFinite(n))return null;return n.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:d});};
  const setText=(el,text)=>{if(el&&text!=null&&el.textContent!==text)el.textContent=text;};

  function formatCatalog(){
    const body=document.getElementById('catalogBody'); if(!body)return;
    [...body.rows].forEach(tr=>{
      const td=tr.cells;if(td.length<11)return;
      const tw=(td[2]?.querySelector('b')?.textContent||'').trim();
      const os=(td[7]?.querySelector('b')?.textContent||'').trim();
      const tdTw=decimals[tw]??2, tdOs=decimals[os]??(os.includes('GC')?1:2);
      [3,4,5].forEach(i=>setText(td[i],fmt(td[i]?.textContent,tdTw)));
      [8,9,10].forEach(i=>setText(td[i],fmt(td[i]?.textContent,tdOs)));
    });
  }

  function formatSpecs(){
    document.querySelectorAll('.spec-line strong').forEach(el=>{
      const raw=el.textContent.trim();
      // Preserve descriptive strings; only shorten standalone/leading numeric values.
      const m=raw.match(/^(-?[\d,.]+(?:\.\d+)?)(.*)$/); if(!m)return;
      const n=numeric(m[1]); if(!Number.isFinite(n))return;
      const abs=Math.abs(n); const d=abs<0.01?6:abs<1?4:abs<100?2:0;
      setText(el,fmt(n,d)+(m[2]||''));
    });
  }

  function formatCostResults(){
    document.querySelectorAll('#costResults .cost-metric b,#customCompareResult .cost-metric b').forEach(el=>{
      const raw=el.textContent.trim(); if(raw.includes('/'))return;
      const n=numeric(raw); if(!Number.isFinite(n))return;
      const abs=Math.abs(n); const d=abs<0.01?6:abs<1?4:abs<1000?2:0;
      setText(el,fmt(n,d));
    });
  }

  function tidyInputs(){
    document.querySelectorAll('.cost-grid input[type="number"],.custom-editor input[type="number"],.custom-compare-grid input[type="number"]').forEach(el=>{
      if(el.dataset.gmmTidy)return; el.dataset.gmmTidy='1';
      el.addEventListener('blur',()=>{const n=Number(el.value);if(Number.isFinite(n))el.value=String(n);});
    });
  }

  let queued=false;
  const refresh=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;formatCatalog();formatSpecs();formatCostResults();tidyInputs();});};

  function observeDirect(id){
    const el=document.getElementById(id);if(!el)return;
    // Observe only direct child replacement. Formatting descendants will not retrigger this observer.
    new MutationObserver(refresh).observe(el,{childList:true,subtree:false});
  }

  function start(){
    refresh();
    observeDirect('catalogBody');
    observeDirect('costResults');
    observeDirect('customCompareResult');
    const spec=document.getElementById('contractSpecSummary');if(spec)new MutationObserver(refresh).observe(spec,{childList:true,subtree:false});
    document.getElementById('catalogFilter')?.addEventListener('change',refresh);
    document.getElementById('calcCostLab')?.addEventListener('click',refresh);
    document.getElementById('calcCustomCompare')?.addEventListener('click',refresh);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();