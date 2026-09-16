import fs from 'node:fs/promises';

let index=await fs.readFile('index.html','utf8');
let app=await fs.readFile('app.js','utf8');
let css=await fs.readFile('styles.css','utf8');

// Navigation
if(!index.includes('data-view="indicators"')){
  index=index.replace('<button data-view="spread">⇄ 價差比較 Spread</button>','<button data-view="spread">⇄ 價差比較 Spread</button><button data-view="indicators">◆ 自訂指標 Indicators</button>');
  index=index.replace('<span data-view="spread">價差比較</span>','<span data-view="spread">價差比較</span><span data-view="indicators">自訂指標</span>');
}

// Independent dashboard view
if(!index.includes('id="indicatorsView"')){
  const view=`
      <section id="indicatorsView" class="view">
        <section class="indicator-dashboard-hero panel">
          <div><h2>自訂指標 Dashboard</h2><p>集中查看所有自設公式的即時計算值、門檻監控與通知狀態。指標公式仍在「價差比較 → Formula Lab」建立與修改。</p></div>
          <button id="goFormulaLab" class="secondary-btn">＋ 建立 / 編輯指標</button>
        </section>
        <section id="indicatorDashboardSummary" class="spread-kpis"></section>
        <section class="panel">
          <div class="formula-lab-head"><div><h3>我的指標 / My Indicators</h3><p>數值會隨行情更新重新計算；監控條件以重新穿越門檻時觸發。</p></div><button id="indicatorDashboardNotify" class="secondary-btn">啟用通知</button></div>
          <div id="indicatorDashboardGrid" class="indicator-dashboard-grid"></div>
        </section>
        <section class="panel">
          <div class="formula-lab-head"><div><h3>監控條件 / Alert Rules</h3><p>查看每一個新指標目前的門檻、現值與觸發狀態。</p></div></div>
          <div id="indicatorDashboardAlerts" class="indicator-dashboard-alerts"></div>
        </section>
      </section>
`;
  const anchor='<section id="connectionsView" class="view">';
  if(index.includes(anchor)) index=index.replace(anchor,view+'\n'+anchor);
  else index=index.replace('</div>\n  </main>',view+'\n    </div>\n  </main>');
}

if(!app.includes('function renderIndicatorDashboard()')){
  const fn=`
function indicatorRuleState(a,v){
  if(v==null)return false;
  return ({'>':v>a.threshold,'>=':v>=a.threshold,'<':v<a.threshold,'<=':v<=a.threshold})[a.op]||false;
}
function renderIndicatorDashboard(){
  const grid=$('#indicatorDashboardGrid'),summary=$('#indicatorDashboardSummary'),alertsEl=$('#indicatorDashboardAlerts');
  if(!grid&&!summary&&!alertsEl)return;
  const rows=customIndicators.map(ind=>{const value=indicatorValue(ind);const rules=indicatorAlerts.filter(a=>a.indicatorId===ind.id);const hits=rules.filter(a=>indicatorRuleState(a,value));return {ind,value,rules,hits}});
  if(summary){
    const triggered=rows.reduce((n,r)=>n+r.hits.length,0),permission=('Notification'in window)?Notification.permission:'unsupported';
    summary.innerHTML='<div class="kpi"><span>自訂指標</span><b>'+customIndicators.length+'</b><small>已儲存公式</small></div><div class="kpi"><span>監控條件</span><b>'+indicatorAlerts.length+'</b><small>大於 / 小於門檻</small></div><div class="kpi"><span>目前觸發</span><b>'+triggered+'</b><small>條件成立</small></div><div class="kpi"><span>通知權限</span><b>'+(permission==='granted'?'ON':permission==='denied'?'OFF':'—')+'</b><small>'+permission+'</small></div>';
  }
  if(grid){
    grid.innerHTML=rows.length?rows.map(r=>'<article class="indicator-dash-card '+(r.hits.length?'is-hit':'')+'"><div class="indicator-dash-head"><div><span class="source-note">CUSTOM INDICATOR</span><h3>'+r.ind.name+'</h3></div><span class="quote-status '+(r.hits.length?'live':'neutral')+'">'+(r.hits.length?'觸發 '+r.hits.length:'監控中')+'</span></div><div class="indicator-dash-value">'+(r.value==null?'—':tidy(r.value,8))+'</div><div class="indicator-dash-formula">'+r.ind.formula+'</div><div class="indicator-dash-rules">'+(r.rules.length?r.rules.map(a=>'<span>'+a.op+' '+a.threshold+'</span>').join(''):'<span>尚未設定監控</span>')+'</div><div class="indicator-dash-actions"><button class="secondary-btn" data-dashboard-edit="'+r.ind.id+'">編輯公式</button></div></article>').join(''):'<div class="source-note">尚未建立新指標。請先到價差比較的 Formula Lab 建立公式並命名。</div>';
    $$('[data-dashboard-edit]').forEach(b=>b.onclick=()=>{const ind=customIndicators.find(x=>x.id===b.dataset.dashboardEdit);if(!ind)return;switchView('spread');if($('#spreadFormula'))$('#spreadFormula').value=ind.formula;if($('#indicatorName'))$('#indicatorName').value=ind.name;calcFormula();setTimeout(()=>$('#spreadFormula')?.scrollIntoView({behavior:'smooth',block:'center'}),80)});
  }
  if(alertsEl){
    alertsEl.innerHTML=indicatorAlerts.length?indicatorAlerts.map(a=>{const ind=customIndicators.find(x=>x.id===a.indicatorId),v=ind?indicatorValue(ind):null,hit=indicatorRuleState(a,v);return '<div class="indicator-alert-item"><div><b>'+(ind?.name||'已刪除指標')+'</b><small>'+a.op+' '+a.threshold+' · 現值 '+(v==null?'—':tidy(v,8))+'</small></div><span class="quote-status '+(hit?'live':'neutral')+'">'+(hit?'條件成立':'監控中')+'</span></div>'}).join(''):'<div class="source-note">尚未建立監控條件。</div>';
  }
}
`;
  app=app.replace('function symbolMap(){',fn+'\nfunction symbolMap(){');
}

// Keep dashboard live and wire actions.
if(!app.includes('renderIndicatorDashboard();evaluateAlerts()')) app=app.replace('renderCustomIndicators();renderIndicatorAlertControls();evaluateAlerts();evaluateIndicatorAlerts()','renderCustomIndicators();renderIndicatorAlertControls();renderIndicatorDashboard();evaluateAlerts();evaluateIndicatorAlerts()');
app=app.replace("if(name==='connections')renderConnections();window.scrollTo", "if(name==='connections')renderConnections();if(name==='indicators')renderIndicatorDashboard();window.scrollTo");
if(!app.includes("$('#goFormulaLab').onclick")) app=app.replace("function bindStaticUI(){bindIndicatorUI();", "function bindStaticUI(){bindIndicatorUI();if($('#goFormulaLab'))$('#goFormulaLab').onclick=()=>switchView('spread');if($('#indicatorDashboardNotify'))$('#indicatorDashboardNotify').onclick=async()=>{if(!('Notification'in window))return alert('此瀏覽器不支援通知');const p=await Notification.requestPermission();renderIndicatorDashboard();alert(p==='granted'?'通知已啟用':'通知未啟用')};");

if(!css.includes('/* indicator-dashboard */')) css+=`
/* indicator-dashboard */
.indicator-dashboard-hero{display:flex;justify-content:space-between;align-items:center;gap:16px}.indicator-dashboard-hero p{margin:6px 0 0;color:var(--muted,#8fa3b8)}
.indicator-dashboard-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-top:12px}.indicator-dash-card{border:1px solid var(--line,#243447);border-radius:12px;padding:14px;background:rgba(255,255,255,.02)}.indicator-dash-card.is-hit{box-shadow:0 0 0 1px rgba(34,223,145,.25) inset}.indicator-dash-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.indicator-dash-head h3{margin:3px 0 0;font-size:16px}.indicator-dash-value{font-size:28px;font-weight:750;font-variant-numeric:tabular-nums;margin:16px 0 10px}.indicator-dash-formula{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:var(--muted,#8fa3b8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.indicator-dash-rules{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.indicator-dash-rules span{font-size:12px;border:1px solid var(--line,#243447);padding:4px 7px;border-radius:999px}.indicator-dash-actions{display:flex;justify-content:flex-end;margin-top:12px}.indicator-dashboard-alerts{display:grid;gap:8px;margin-top:10px}
@media(max-width:720px){.indicator-dashboard-hero{align-items:flex-start;flex-direction:column}.indicator-dashboard-hero button{width:100%}.indicator-dashboard-grid{grid-template-columns:1fr}}
`;

index=index.replace(/app\.js\?v=[^\"']+/,'app.js?v=20260916-indicator-dashboard1');
await fs.writeFile('index.html',index);
await fs.writeFile('app.js',app);
await fs.writeFile('styles.css',css);
console.log('Independent custom indicator dashboard installed.');
