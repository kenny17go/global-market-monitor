// Global Market Monitor v1.5.1 - display precision only
// Keeps raw quote precision intact; only shortens numbers shown in the cross-market catalog.
(()=>{
  const decimals={
    SPF:2, ES:2,
    UNF:0, NQ:2,
    UDF:0, YM:0,
    SXF:1, SOX:1,
    TJF:1, TOPIX:1,
    F1F:1, Z:1,
    RHF:4, CNH:4,
    XEF:4, '6E':4,
    XJF:2, '6J':6,
    XBF:4, '6B':4,
    XAF:4, '6A':4,
    GDF:1, GC:1,
    TGF:0,
    BRF:2, BRENT:2
  };

  const fmt=(value,d)=>{
    const n=Number(String(value).replace(/,/g,''));
    if(!Number.isFinite(n)) return value;
    return n.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
  };

  function formatCatalog(){
    const body=document.getElementById('catalogBody');
    if(!body) return;
    [...body.querySelectorAll('tr')].forEach(tr=>{
      const td=tr.children;
      if(td.length<11) return;
      const twCode=(td[2]?.querySelector('b')?.textContent||td[2]?.textContent||'').trim();
      const osCode=(td[7]?.querySelector('b')?.textContent||td[7]?.textContent||'').trim();
      const twD=decimals[twCode] ?? 2;
      const osD=decimals[osCode] ?? (osCode.includes('GC')?1:2);
      [3,4,5].forEach(i=>{ if(td[i]) td[i].textContent=fmt(td[i].textContent,twD); });
      [8,9,10].forEach(i=>{ if(td[i]) td[i].textContent=fmt(td[i].textContent,osD); });
    });
  }

  const start=()=>{
    formatCatalog();
    const body=document.getElementById('catalogBody');
    if(body){
      new MutationObserver(()=>requestAnimationFrame(formatCatalog)).observe(body,{childList:true,subtree:true});
    }
    const filter=document.getElementById('catalogFilter');
    if(filter) filter.addEventListener('change',()=>setTimeout(formatCatalog,0));
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(start,400));
  else setTimeout(start,400);
})();
