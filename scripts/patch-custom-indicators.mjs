import fs from 'node:fs/promises';

let index=await fs.readFile('index.html','utf8');
let app=await fs.readFile('app.js','utf8');
let css=await fs.readFile('styles.css','utf8');

if(!index.includes('id="indicatorName"')){
  const block=`
          <div class="indicator-lab">
            <div class="indicator-title-row"><div><b>新指標 / Custom Indicator</b><small>先將上方自設公式命名儲存，再設定門檻監控。</small></div></div>
            <div class="indicator-save-row"><input id="indicatorName" placeholder="指標名稱，例如：台黃近月價差"><button id="saveIndicator">儲存為新指標</button></div>
            <div id="indicatorList" class="indicator-list"></div>
            <div class="indicator-alert-builder">
              <select id="indicatorAlertSelect"><option value="">選擇新指標…</option></select>
              <select id="indicatorAlertOp"><option value=">">大於 &gt;</option><option value=">=">大於等於 &gt;=</option><option value="<">小於 &lt;</option><option value="<=">小於等於 &lt;=</option></select>
              <input id="indicatorAlertThreshold" type="number" step="any" placeholder="門檻值">
              <select id="indicatorAlertCooldown"><option value="0">每次重新穿越門檻通知</option><option value="300">至少間隔 5 分鐘</option><option value="900">至少間隔 15 分鐘</option><option value="3600">至少間隔 1 小時</option></select>
              <button id="addIndicatorAlert">＋ 建立監控</button><button id="indicatorNotifyBtn" class="secondary-btn">啟用通知</button>
            </div>
            <div id="indicatorAlertList" class="indicator-alert-list"></div>
          </div>`;
  const re=/(<div[^>]*id="formulaResult"[^>]*>[\s\S]*?<\/div>)/;
  if(!re.test(index)) throw new Error('formulaResult anchor not found');
  index=index.replace(re,'$1'+block);
}

if(!app.includes("const INDICATOR_KEY='gmmCustomIndicatorsV1'")){
  app=app.replace('let costInitialized=false;',`let costInitialized=false;\nconst INDICATOR_KEY='gmmCustomIndicatorsV1';\nconst INDICATOR_ALERT_KEY='gmmIndicatorAlertsV1';\nlet customIndicators=(()=>{try{return JSON.parse(localStorage.getItem(INDICATOR_KEY)||'[]')}catch{return []}})();\nlet indicatorAlerts=(()=>{try{return JSON.parse(localStorage.getItem(INDICATOR_ALERT_KEY)||'[]')}catch{return []}})();`);
}

if(!app.includes('function renderCustomIndicators()')){
  const funcs=`
function indicatorValue(ind){
  const r=evalMarketFormula(ind?.formula||'');
  return r.ok&&r.type==='number'&&Number.isFinite(Number(r.value))?Number(r.value):null;
}
function saveIndicators(){localStorage.setItem(INDICATOR_KEY,JSON.stringify(customIndicators))}
function saveIndicatorAlerts(){localStorage.setItem(INDICATOR_ALERT_KEY,JSON.stringify(indicatorAlerts))}
function renderCustomIndicators(){
  const el=$('#indicatorList');if(!el)return;
  el.innerHTML=customIndicators.length?customIndicators.map(ind=>{const v=indicatorValue(ind);return '<div class="indicator-card"><div><b>'+ind.name+'</b><small>'+ind.formula+'</small></div><div class="indicator-card-value">'+(v==null?'—':tidy(v,8))+'</div><button class="secondary-btn" data-load-indicator="'+ind.id+'">載入</button><button class="secondary-btn" data-del-indicator="'+ind.id+'">刪除</button></div>'}).join(''):'<div class="source-note">尚未建立新指標。先在上方完成公式，再命名儲存。</div>';
  $$('[data-load-indicator]').forEach(b=>b.onclick=()=>{const ind=customIndicators.find(x=>x.id===b.dataset.loadIndicator);if(ind&&$('#spreadFormula')){$('#spreadFormula').value=ind.formula;if($('#indicatorName'))$('#indicatorName').value=ind.name;calcFormula()}});
  $$('[data-del-indicator]').forEach(b=>b.onclick=()=>{const id=b.dataset.delIndicator;customIndicators=customIndicators.filter(x=>x.id!==id);indicatorAlerts=indicatorAlerts.filter(x=>x.indicatorId!==id);saveIndicators();saveIndicatorAlerts();renderCustomIndicators();renderIndicatorAlertControls()});
}
function renderIndicatorAlertControls(){
  const sel=$('#indicatorAlertSelect');if(sel){const cur=sel.value;sel.innerHTML='<option value="">選擇新指標…</option>'+customIndicators.map(x=>'<option value="'+x.id+'">'+x.name+'</option>').join('');if([...sel.options].some(o=>o.value===cur))sel.value=cur}
  const el=$('#indicatorAlertList');if(!el)return;
  el.innerHTML=indicatorAlerts.length?indicatorAlerts.map(a=>{const ind=customIndicators.find(x=>x.id===a.indicatorId),v=ind?indicatorValue(ind):null,hit=v!=null?({'>':v>a.threshold,'>=':v>=a.threshold,'<':v<a.threshold,'<=':v<=a.threshold})[a.op]:false;return '<div class="indicator-alert-item"><div><b>'+(ind?.name||'已刪除指標')+'</b><small>'+a.op+' '+a.threshold+' · 現值 '+(v==null?'—':tidy(v,8))+'</small></div><span class="quote-status '+(hit?'live':'neutral')+'">'+(hit?'條件成立':'監控中')+'</span><button class="secondary-btn" data-del-ind-alert="'+a.id+'">刪除</button></div>'}).join(''):'<div class="source-note">尚未建立新指標監控。</div>';
  $$('[data-del-ind-alert]').forEach(b=>b.onclick=()=>{indicatorAlerts=indicatorAlerts.filter(x=>x.id!==b.dataset.delIndAlert);saveIndicatorAlerts();renderIndicatorAlertControls()});
}
function evaluateIndicatorAlerts(){
  let changed=false;const now=Date.now();
  indicatorAlerts.forEach(a=>{const ind=customIndicators.find(x=>x.id===a.indicatorId);if(!ind)return;const v=indicatorValue(ind);if(v==null)return;const hit=({'>':v>a.threshold,'>=':v>=a.threshold,'<':v<a.threshold,'<=':v<=a.threshold})[a.op];if(!hit){if(a.active){a.active=false;changed=true}return}const cooldown=(a.cooldown||0)*1000;if(a.active)return;if(a.lastHit&&cooldown&&now-a.lastHit<cooldown)return;a.active=true;a.lastHit=now;changed=true;if('Notification'in window&&Notification.permission==='granted')new Notification('新指標監控',{body:ind.name+' '+a.op+' '+a.threshold+'｜目前 '+tidy(v,8)})});
  if(changed)saveIndicatorAlerts();
}
function bindIndicatorUI(){
  if($('#saveIndicator'))$('#saveIndicator').onclick=()=>{const name=$('#indicatorName')?.value.trim(),formula=$('#spreadFormula')?.value.trim();if(!name)return alert('請先輸入新指標名稱');if(!formula)return alert('請先建立自設公式');const r=evalMarketFormula(formula);if(!r.ok||r.type!=='number'||!Number.isFinite(Number(r.value)))return alert('目前公式無法產生可用數值：'+(r.error||'請檢查公式'));const old=customIndicators.find(x=>x.name===name);if(old){old.formula=formula;old.updatedAt=new Date().toISOString()}else customIndicators.push({id:'IND_'+Date.now().toString(36),name,formula,createdAt:new Date().toISOString()});saveIndicators();renderCustomIndicators();renderIndicatorAlertControls()};
  if($('#addIndicatorAlert'))$('#addIndicatorAlert').onclick=()=>{const indicatorId=$('#indicatorAlertSelect')?.value,op=$('#indicatorAlertOp')?.value,threshold=Number($('#indicatorAlertThreshold')?.value),cooldown=Number($('#indicatorAlertCooldown')?.value||0);if(!indicatorId)return alert('請先選擇新指標');if(!Number.isFinite(threshold))return alert('請輸入有效門檻值');indicatorAlerts.push({id:'AL_'+Date.now().toString(36),indicatorId,op,threshold,cooldown,active:false,lastHit:0});saveIndicatorAlerts();renderIndicatorAlertControls();evaluateIndicatorAlerts()};
  if($('#indicatorNotifyBtn'))$('#indicatorNotifyBtn').onclick=async()=>{if(!('Notification'in window))return alert('此瀏覽器不支援通知');const p=await Notification.requestPermission();alert(p==='granted'?'通知已啟用':'通知未啟用')};
}
`;
  app=app.replace('function symbolMap(){',funcs+'\nfunction symbolMap(){');
}

if(!app.includes('bindIndicatorUI();')) app=app.replace('function bindStaticUI(){','function bindStaticUI(){bindIndicatorUI();');
app=app.replace('renderCatalog();evaluateAlerts()','renderCatalog();renderCustomIndicators();renderIndicatorAlertControls();evaluateAlerts();evaluateIndicatorAlerts()');
if(!app.includes("renderCustomIndicators();renderIndicatorAlertControls();evaluateIndicatorAlerts();if(src)src.textContent='NDF '")){
  app=app.replace("if(src)src.textContent='NDF '+(off?.source||'—')+' · '+(off?.mode||'—')+' · 自動換月'","renderCustomIndicators();renderIndicatorAlertControls();evaluateIndicatorAlerts();if(src)src.textContent='NDF '+(off?.source||'—')+' · '+(off?.mode||'—')+' · 自動換月'");
}

if(!css.includes('/* custom-indicator-lab */')) css+=`\n/* custom-indicator-lab */\n.indicator-lab{margin-top:16px;padding-top:14px;border-top:1px solid var(--line,#243447)}\n.indicator-title-row{display:flex;justify-content:space-between;gap:12px;margin-bottom:10px}.indicator-title-row small{display:block;color:var(--muted,#8fa3b8);margin-top:4px}\n.indicator-save-row,.indicator-alert-builder{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.indicator-save-row input{min-width:220px;flex:1}.indicator-alert-builder select,.indicator-alert-builder input{min-width:140px}\n.indicator-list,.indicator-alert-list{display:grid;gap:8px;margin-top:10px}.indicator-card,.indicator-alert-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--line,#243447);border-radius:10px;background:rgba(255,255,255,.02)}\n.indicator-card>div:first-child,.indicator-alert-item>div:first-child{min-width:0;flex:1}.indicator-card small,.indicator-alert-item small{display:block;color:var(--muted,#8fa3b8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px}.indicator-card-value{font-variant-numeric:tabular-nums;font-weight:700}\n@media(max-width:720px){.indicator-card,.indicator-alert-item{align-items:flex-start;flex-wrap:wrap}.indicator-card>div:first-child,.indicator-alert-item>div:first-child{flex-basis:100%}.indicator-alert-builder>*{flex:1 1 140px}}\n`;

index=index.replace(/app\.js\?v=[^\"']+/,'app.js?v=20260916-indicator1');
await fs.writeFile('index.html',index);
await fs.writeFile('app.js',app);
await fs.writeFile('styles.css',css);
console.log('Named custom indicators and alert rules installed.');
