// Global Market Monitor v1.6 - Custom Products
(()=>{
  const KEY='gmmCustomProductsV16';
  const $=s=>document.querySelector(s);
  const num=(v,d=0)=>{const n=Number(v);return Number.isFinite(n)?n:d};
  const tidy=(v,max=6)=>{const n=Number(v);if(!Number.isFinite(n))return '—';return n.toLocaleString('en-US',{maximumFractionDigits:max});};
  const uid=()=>`CUS_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`.toUpperCase();
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}};
  const save=v=>localStorage.setItem(KEY,JSON.stringify(v));
  let products=load();
  let editingId=null;

  const quoteMap=()=>{
    const out=[];
    const rows=(window.DATA&&DATA.crossMarketCatalog)||[];
    rows.forEach(x=>{
      [x.tw,x.os].forEach(q=>{
        if(!q?.id)return;
        out.push({id:q.id,label:`${x.name}｜${q.exchange} ${q.code}`,exchange:q.exchange,code:q.code,bid:q.bid,ask:q.ask,last:q.last});
      });
    });
    return out;
  };
  const builtins=()=>{
    const rows=(window.DATA&&DATA.crossMarketCatalog)||[];
    return rows.flatMap(x=>[
      {id:x.tw.id,name:x.name,code:x.tw.code,exchange:x.tw.exchange,currency:'TWD',bid:x.tw.bid,ask:x.tw.ask,last:x.tw.last,multiplier:1,tick:0,unitFactor:1,fx:1,cost:0,source:'built-in'},
      {id:x.os.id,name:x.name,code:x.os.code,exchange:x.os.exchange,currency:'',bid:x.os.bid,ask:x.os.ask,last:x.os.last,multiplier:1,tick:0,unitFactor:1,fx:1,cost:0,source:'built-in'}
    ]);
  };
  const getProduct=id=>{
    const c=products.find(x=>x.id===id); if(c) return resolveProduct(c);
    return builtins().find(x=>x.id===id)||null;
  };
  const resolveProduct=p=>{
    if(p.mode==='reference'&&p.referenceId){
      const q=quoteMap().find(x=>x.id===p.referenceId);
      if(q) return {...p,bid:q.bid,ask:q.ask,last:q.last,exchange:p.exchange||q.exchange,code:p.code||q.code};
    }
    return p;
  };

  function inject(){
    const cost=$('.cost-lab'); if(!cost||$('#customProductPanel'))return;
    const wrap=document.createElement('section');
    wrap.id='customProductPanel';
    wrap.className='custom-products-wrap';
    wrap.innerHTML=`
      <div class="custom-products-head">
        <div><h3>我的產品 / Custom Products</h3><p>新增自己的期貨、ETF、CFD、OTC 或其他報價。可用手動報價，或引用目前已有的行情代碼。</p></div>
        <button id="newCustomProduct" class="secondary-btn">＋ 新增自選產品</button>
      </div>
      <div id="customProductList" class="custom-product-list"></div>
      <div id="customProductEditor" class="custom-editor hidden">
        <div class="custom-editor-grid">
          <label>產品名稱<input id="cpName" placeholder="例：My Broker ES CFD"></label>
          <label>代碼<input id="cpCode" placeholder="例：ES-CFD"></label>
          <label>交易所 / 來源<input id="cpExchange" placeholder="例：Broker / OTC"></label>
          <label>幣別<input id="cpCurrency" placeholder="USD / TWD / JPY"></label>
          <label>報價模式<select id="cpMode"><option value="manual">手動報價</option><option value="reference">引用既有行情</option></select></label>
          <label class="cp-ref">引用行情<select id="cpReference"></select></label>
          <label>Bid<input id="cpBid" type="number" step="any"></label>
          <label>Ask<input id="cpAsk" type="number" step="any"></label>
          <label>Last<input id="cpLast" type="number" step="any"></label>
          <label>合約乘數<input id="cpMultiplier" type="number" step="any" value="1"></label>
          <label>Tick Size<input id="cpTick" type="number" step="any" value="0.01"></label>
          <label>單位換算<input id="cpUnitFactor" type="number" step="any" value="1"></label>
          <label>FX → TWD<input id="cpFx" type="number" step="any" value="1"></label>
          <label>每口交易成本<input id="cpCost" type="number" step="any" value="0"></label>
          <label>到期月份<input id="cpExpiry" placeholder="2026/12 或 Spot"></label>
          <label class="wide">備註<input id="cpNote" placeholder="券商規格、報價來源、特殊換算方式…"></label>
        </div>
        <div class="custom-editor-actions"><button id="saveCustomProduct">儲存產品</button><button id="cancelCustomProduct" class="secondary-btn">取消</button></div>
      </div>
      <div class="custom-compare">
        <div class="custom-products-head"><div><h3>自選 A ↔ B 比較器</h3><p>內建商品與自選商品可任意混搭。顯示數字會簡化，但計算使用完整值。</p></div></div>
        <div class="custom-compare-grid">
          <label>A 產品<select id="ccA"></select></label><label>A 價格<select id="ccAField"><option value="bid">Bid</option><option value="ask">Ask</option><option value="last">Last</option></select></label><label>A 口數<input id="ccAQty" type="number" step="any" value="1"></label>
          <label>B 產品<select id="ccB"></select></label><label>B 價格<select id="ccBField"><option value="ask">Ask</option><option value="bid">Bid</option><option value="last">Last</option></select></label><label>B 口數<input id="ccBQty" type="number" step="any" value="1"></label>
        </div>
        <div class="custom-compare-actions"><button id="calcCustomCompare">計算 A − B</button><span class="source-note">名目金額 = 價格 × 乘數 × 單位換算 × FX × 口數；再扣雙方交易成本。</span></div>
        <div id="customCompareResult" class="custom-compare-results"></div>
      </div>`;
    cost.appendChild(wrap);
    bind();renderAll();
  }

  function refOptions(){return '<option value="">選擇既有行情…</option>'+quoteMap().map(q=>`<option value="${q.id}">${q.label}</option>`).join('')}
  function productOptions(){
    const c=products.map(p=>`<option value="${p.id}">★ ${p.name}｜${p.exchange||'自選'} ${p.code||''}</option>`).join('');
    const b=builtins().map(p=>`<option value="${p.id}">${p.name}｜${p.exchange} ${p.code}</option>`).join('');
    return `<optgroup label="我的產品">${c||'<option disabled>尚無自選產品</option>'}</optgroup><optgroup label="內建商品">${b}</optgroup>`;
  }
  function renderAll(){
    renderList();
    const ref=$('#cpReference');if(ref)ref.innerHTML=refOptions();
    ['#ccA','#ccB'].forEach(s=>{const el=$(s);if(el){const v=el.value;el.innerHTML=productOptions();if([...el.options].some(o=>o.value===v))el.value=v;}});
  }
  function renderList(){
    const el=$('#customProductList');if(!el)return;
    el.innerHTML=products.length?products.map(p=>{const r=resolveProduct(p);return `<div class="custom-product-card"><div><b>${p.name}</b><span>${p.exchange||'自選'} · ${p.code||'—'} · ${p.currency||'—'}</span><small>${p.mode==='reference'?'引用 '+p.referenceId:'手動報價'} · Bid ${tidy(r.bid)} / Ask ${tidy(r.ask)} / Last ${tidy(r.last)}</small></div><div class="custom-product-actions"><button data-edit="${p.id}">編輯</button><button data-copy="${p.id}">複製</button><button data-delete="${p.id}">刪除</button></div></div>`}).join(''):`<div class="empty-custom">尚未建立自選產品。可新增券商 CFD、其他交易所期貨、ETF、OTC 報價等。</div>`;
    el.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openEditor(b.dataset.edit));
    el.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>copyProduct(b.dataset.copy));
    el.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteProduct(b.dataset.delete));
  }
  function openEditor(id=null){
    editingId=id; const p=id?products.find(x=>x.id===id):null;
    $('#customProductEditor').classList.remove('hidden');
    $('#cpReference').innerHTML=refOptions();
    const vals={cpName:p?.name||'',cpCode:p?.code||'',cpExchange:p?.exchange||'',cpCurrency:p?.currency||'USD',cpMode:p?.mode||'manual',cpReference:p?.referenceId||'',cpBid:p?.bid??'',cpAsk:p?.ask??'',cpLast:p?.last??'',cpMultiplier:p?.multiplier??1,cpTick:p?.tick??0.01,cpUnitFactor:p?.unitFactor??1,cpFx:p?.fx??1,cpCost:p?.cost??0,cpExpiry:p?.expiry||'',cpNote:p?.note||''};
    Object.entries(vals).forEach(([k,v])=>{const e=$('#'+k);if(e)e.value=v});toggleMode();
  }
  function closeEditor(){$('#customProductEditor')?.classList.add('hidden');editingId=null}
  function toggleMode(){const ref=$('#cpMode')?.value==='reference';document.querySelector('.cp-ref')?.classList.toggle('hidden',!ref);['#cpBid','#cpAsk','#cpLast'].forEach(s=>{const e=$(s);if(e)e.disabled=ref;});}
  function collect(){
    return {id:editingId||uid(),name:$('#cpName').value.trim(),code:$('#cpCode').value.trim(),exchange:$('#cpExchange').value.trim(),currency:$('#cpCurrency').value.trim().toUpperCase(),mode:$('#cpMode').value,referenceId:$('#cpReference').value,bid:num($('#cpBid').value),ask:num($('#cpAsk').value),last:num($('#cpLast').value),multiplier:num($('#cpMultiplier').value,1),tick:num($('#cpTick').value,0.01),unitFactor:num($('#cpUnitFactor').value,1),fx:num($('#cpFx').value,1),cost:num($('#cpCost').value),expiry:$('#cpExpiry').value.trim(),note:$('#cpNote').value.trim()};
  }
  function saveProduct(){const p=collect();if(!p.name)return alert('請輸入產品名稱');if(p.mode==='reference'&&!p.referenceId)return alert('請選擇要引用的行情');const i=products.findIndex(x=>x.id===p.id);if(i>=0)products[i]=p;else products.push(p);save(products);closeEditor();renderAll();}
  function copyProduct(id){const p=products.find(x=>x.id===id);if(!p)return;products.push({...p,id:uid(),name:p.name+' 複製'});save(products);renderAll();}
  function deleteProduct(id){const p=products.find(x=>x.id===id);if(!p)return;if(!confirm(`刪除「${p.name}」？`))return;products=products.filter(x=>x.id!==id);save(products);renderAll();}
  function calcCompare(){
    const a=getProduct($('#ccA').value), b=getProduct($('#ccB').value);if(!a||!b)return;
    const af=$('#ccAField').value,bf=$('#ccBField').value,aq=num($('#ccAQty').value,1),bq=num($('#ccBQty').value,1);
    const ap=num(a[af]),bp=num(b[bf]);
    const aPoint=num(a.multiplier,1)*num(a.unitFactor,1)*num(a.fx,1); const bPoint=num(b.multiplier,1)*num(b.unitFactor,1)*num(b.fx,1);
    const aNot=ap*aPoint*aq,bNot=bp*bPoint*bq,cost=num(a.cost)*aq+num(b.cost)*bq,net=aNot-bNot-cost;
    const priceDiff=ap-bp; const hedge=bPoint?Math.abs(aPoint/bPoint):0;
    $('#customCompareResult').innerHTML=`
      <div class="cost-metric"><span>A 價格</span><b>${tidy(ap,6)}</b><small>${a.code||''} ${af.toUpperCase()}</small></div>
      <div class="cost-metric"><span>B 價格</span><b>${tidy(bp,6)}</b><small>${b.code||''} ${bf.toUpperCase()}</small></div>
      <div class="cost-metric"><span>原始價格差 A−B</span><b>${tidy(priceDiff,6)}</b><small>未做單位正規化</small></div>
      <div class="cost-metric"><span>每點價值 A / B</span><b>${tidy(aPoint,4)} / ${tidy(bPoint,4)}</b><small>共同幣別</small></div>
      <div class="cost-metric"><span>建議 B:A 避險比</span><b>${tidy(hedge,4)}</b><small>依每點價值</small></div>
      <div class="cost-metric"><span>成本後名目差額</span><b class="${net>=0?'pos':'neg'}">${tidy(net,2)}</b><small>不等同套利獲利</small></div>`;
  }
  function bind(){
    $('#newCustomProduct').onclick=()=>openEditor();$('#cancelCustomProduct').onclick=closeEditor;$('#saveCustomProduct').onclick=saveProduct;$('#cpMode').onchange=toggleMode;$('#calcCustomCompare').onclick=calcCompare;
  }
  const boot=()=>{if(window.DATA&&document.querySelector('.cost-lab'))inject();else setTimeout(boot,250)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,500));else setTimeout(boot,500);
})();
