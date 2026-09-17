// TradingView click-chart integration intentionally disabled.
// Global Market Monitor is a spread-comparison tool: quote freshness, source quality,
// contract matching and bid/ask accuracy take priority over historical charting.
// TradingView may still be used by backend/research workflows as a reference/check source,
// but this frontend file must not add click handlers, chart widgets or navigation.
(function(){
  function cleanup(){
    const viewer=document.getElementById('tvSparkViewer');
    if(viewer)viewer.remove();
    document.querySelectorAll('.tv-active,.tv-spark-trigger').forEach(el=>{
      el.classList.remove('tv-active','tv-spark-trigger');
      el.removeAttribute('role');
      el.removeAttribute('tabindex');
      el.removeAttribute('title');
      delete el.dataset.tvWidgetBound;
    });
  }

  const esc=s=>String(s??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const modeClass=m=>/LIVE/i.test(m||'')?'live':/DELAY|DAILY|EOD/i.test(m||'')?'neutral':'neutral';
  function selectedContract(q,selectId){
    const month=document.getElementById(selectId)?.value;
    if(month&&Array.isArray(q?.contracts))return q.contracts.find(c=>c.month===month)||null;
    return null;
  }
  function verifiedDelay(q,m){
    const mode=String(m?.mode||'');
    if(/LIVE/i.test(mode))return 'LIVE';
    if(/DAILY|EOD|OFFICIAL/i.test(mode))return 'OFFICIAL DAILY / EOD';
    if(!/DELAY/i.test(mode))return mode||'UNKNOWN';
    const market=`${q?.exchange||''} ${q?.id||''} ${q?.code||''} ${m?.source||''}`.toUpperCase();
    // Exchange-published public quote policies: CME Group futures >=10m; JPX/OSE futures >=15m.
    if(/CME|CBOT|COMEX|NYMEX/.test(market))return 'DELAYED ≥10m';
    if(/JPX|OSE|OSAKA/.test(market))return 'DELAYED ≥15m';
    // ICE/Yahoo and other fallbacks remain DELAYED unless an exact venue delay is verified.
    return 'DELAYED';
  }
  function legMeta(q,selectId){
    const c=selectedContract(q,selectId);
    const meta={
      source:q?.source||'—',
      mode:q?.quoteMode||'UNKNOWN',
      timestamp:c?.timestamp||c?.date||q?.quoteTimestamp||q?.quoteDate||null,
      month:c?.month||document.getElementById(selectId)?.value||q?.expiry||'—'
    };
    meta.displayMode=verifiedDelay(q,meta);
    return meta;
  }
  function parsedTs(v){
    if(!v)return null;
    if(/^\d{4}-\d{2}-\d{2}$/.test(String(v)))return null;
    const t=Date.parse(v);return Number.isFinite(t)?t:null;
  }
  function fmtTime(v){
    if(!v)return '無時間戳';
    if(/^\d{4}-\d{2}-\d{2}$/.test(String(v)))return String(v)+' 日資料';
    const t=Date.parse(v);if(!Number.isFinite(t))return String(v);
    return new Date(t).toLocaleString('zh-TW',{hour12:false,month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }
  function syncState(a,b){
    const ma=String(a.mode||''),mb=String(b.mode||'');
    if(/DAILY|EOD|OFFICIAL/i.test(ma)||/DAILY|EOD|OFFICIAL/i.test(mb))return {level:'warn',text:'⚠ 含官方日資料 / EOD，不能視為同時報價'};
    const ta=parsedTs(a.timestamp),tb=parsedTs(b.timestamp);
    if(!ta||!tb)return {level:'warn',text:'⚠ 缺少可比較的即時時間戳'};
    const mins=Math.abs(ta-tb)/60000;
    if(mins<=2)return {level:'ok',text:`✓ 報價時間接近 · 相差 ${mins.toFixed(1)} 分鐘`};
    if(mins<=10)return {level:'caution',text:`△ 報價時間差 ${mins.toFixed(1)} 分鐘 · 計算時請留意`};
    return {level:'warn',text:`⚠ 報價不同步 · 相差 ${mins.toFixed(1)} 分鐘`};
  }
  function ensureStyle(){
    if(document.getElementById('quoteQualityStyle'))return;
    const s=document.createElement('style');s.id='quoteQualityStyle';s.textContent=`
      .quote-quality-box{margin:14px 0;padding:12px;border:1px solid rgba(148,163,184,.22);border-radius:12px;background:rgba(8,20,34,.55)}
      .quote-quality-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px}.quote-quality-head b{font-size:14px}.quote-sync{font-size:12px;font-weight:700}.quote-sync.ok{color:#5ee6a8}.quote-sync.caution{color:#f6c85f}.quote-sync.warn{color:#ff8b8b}
      .quote-quality-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.quote-leg{padding:10px;border-radius:10px;background:rgba(255,255,255,.035)}.quote-leg strong{display:block;font-size:13px;margin-bottom:5px}.quote-leg small{display:block;line-height:1.55;color:#9fb0c3}.quote-leg .quote-status{display:inline-block;margin-left:6px}
      .quote-delay-note{margin-top:8px;font-size:11px;line-height:1.5;color:#8293a8}
      @media(max-width:720px){.quote-quality-grid{grid-template-columns:1fr}.quote-quality-head{align-items:flex-start;flex-direction:column}}
    `;document.head.appendChild(s);
  }
  function renderQuality(){
    const results=document.getElementById('costResults');
    if(!results||typeof selectedCostRow!=='function')return;
    let row;try{row=selectedCostRow()}catch(e){return}if(!row?.tw||!row?.os)return;
    ensureStyle();
    let box=document.getElementById('quoteQualityBox');
    if(!box){box=document.createElement('div');box.id='quoteQualityBox';box.className='quote-quality-box';results.parentNode.insertBefore(box,results)}
    const a=legMeta(row.tw,'twExpiry'),b=legMeta(row.os,'osExpiry'),sync=syncState(a,b);
    const card=(title,q,m)=>`<div class="quote-leg"><strong>${esc(title)} ${esc(q.code)} · ${esc(m.month)} <span class="quote-status ${modeClass(m.mode)}">${esc(m.displayMode)}</span></strong><small>來源：${esc(m.source)}</small><small>報價時間：${esc(fmtTime(m.timestamp))}</small></div>`;
    box.innerHTML=`<div class="quote-quality-head"><b>報價品質 / Quote Quality</b><span class="quote-sync ${sync.level}">${esc(sync.text)}</span></div><div class="quote-quality-grid">${card(row.tw.exchange||'TAIFEX',row.tw,a)}${card(row.os.exchange||'海外',row.os,b)}</div><div class="quote-delay-note">延遲標示採交易所公開規則：CME Group 公開期貨行情至少延遲 10 分鐘；JPX/OSE 公開期貨行情至少延遲 15 分鐘。其他來源若無可驗證的固定延遲，只標示 DELAYED，不自行推定分鐘數。</div>`;
  }
  function bindQuality(){
    cleanup();renderQuality();
    ['costProduct','twExpiry','osExpiry','twPriceField','osPriceField','costDirection'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>setTimeout(renderQuality,0)));
    setInterval(renderQuality,3000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindQuality,{once:true});else bindQuality();
})();
