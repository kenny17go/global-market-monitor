// Global Market Monitor v1.5.2 - display precision only
// Keeps raw quote/calculation precision intact; only shortens numbers shown in UI.
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

  const num=v=>Number(String(v).replace(/,/g,''));
  const fixed=(value,d,trim=false)=>{
    const n=num(value); if(!Number.isFinite(n)) return value;
    if(trim){
      const s=n.toFixed(d).replace(/\.0+$/,'').replace(/(\.\d*?)0+$/,'$1');
      return s;
    }
    return n.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
  };
  const smartDigits=n=>{
    n=Math.abs(Number(n));
    if(!Number.isFinite(n)) return 2;
    if(n===0) return 0;
    if(n>=1000) return 0;
    if(n>=100) return 1;
    if(n>=1) return 2;
    if(n>=0.1) return 3;
    if(n>=0.01) return 4;
    return 6;
  };
  const smart=(value,trim=false)=>{
    const n=num(value); if(!Number.isFinite(n)) return value;
    return fixed(n,smartDigits(n),trim);
  };
  const formatNumericText=(text)=>String(text).replace(/-?\d[\d,]*(?:\.\d+)?/g,m=>{
    const n=num(m); return Number.isFinite(n)?smart(n,false):m;
  });

  function formatCatalog(){
    const body=document.getElementById('catalogBody'); if(!body) return;
    [...body.querySelectorAll('tr')].forEach(tr=>{
      const td=tr.children; if(td.length<11) return;
      const twCode=(td[2]?.querySelector('b')?.textContent||td[2]?.textContent||'').trim();
      const osCode=(td[7]?.querySelector('b')?.textContent||td[7]?.textContent||'').trim();
      const twD=decimals[twCode] ?? 2;
      const osD=decimals[osCode] ?? (osCode.includes('GC')?1:2);
      [3,4,5].forEach(i=>{ if(td[i]) td[i].textContent=fixed(td[i].textContent,twD); });
      [8,9,10].forEach(i=>{ if(td[i]) td[i].textContent=fixed(td[i].textContent,osD); });
    });
  }

  function formatSpecs(){
    document.querySelectorAll('.spec-line').forEach(line=>{
      const label=(line.querySelector('span')?.textContent||'').toLowerCase();
      const strong=line.querySelector('strong'); if(!strong) return;
      const raw=strong.textContent;
      // Keep month/cycle descriptions untouched; only normalize numeric specification values.
      if(/month|月份|週期|currency|幣別|quote|報價|exchange|交易所/i.test(label)) return;
      strong.textContent=formatNumericText(raw);
    });
  }

  function formatCostResults(){
    document.querySelectorAll('#costResults .cost-metric').forEach(card=>{
      const b=card.querySelector('b'); if(!b) return;
      b.textContent=formatNumericText(b.textContent);
      const small=card.querySelector('small'); if(small) small.textContent=formatNumericText(small.textContent);
    });
  }

  function tidyCostInputs(){
    const ids=['twMultiplier','osMultiplier','twContracts','osContracts','twUnitFactor','osUnitFactor','osFx','twCost','osCost','otherCost'];
    ids.forEach(id=>{
      const el=document.getElementById(id); if(!el||el.dataset.precisionBound) return;
      el.dataset.precisionBound='1';
      const tidy=()=>{const n=Number(el.value);if(Number.isFinite(n)) el.value=smart(n,true)};
      el.addEventListener('blur',tidy);
      tidy();
    });
  }

  function applyAll(){ formatCatalog(); formatSpecs(); formatCostResults(); tidyCostInputs(); }

  const start=()=>{
    applyAll();
    ['catalogBody','costResults'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) new MutationObserver(()=>requestAnimationFrame(applyAll)).observe(el,{childList:true,subtree:true,characterData:true});
    });
    const spread=document.getElementById('spreadView');
    if(spread) new MutationObserver(()=>requestAnimationFrame(applyAll)).observe(spread,{childList:true,subtree:true});
    const filter=document.getElementById('catalogFilter');
    if(filter) filter.addEventListener('change',()=>setTimeout(applyAll,0));
    const product=document.getElementById('costProduct');
    if(product) product.addEventListener('change',()=>setTimeout(applyAll,50));
    const calc=document.getElementById('calcCostLab');
    if(calc) calc.addEventListener('click',()=>setTimeout(applyAll,50));
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(start,500));
  else setTimeout(start,500);
})();
