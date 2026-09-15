import fs from 'node:fs/promises';

let index=await fs.readFile('index.html','utf8');
let app=await fs.readFile('app.js','utf8');
let providers=await fs.readFile('providers.js','utf8');
let styles=await fs.readFile('styles.css','utf8');
const extract=fn=>fn.toString().match(/\/\*([\s\S]*?)\*\//)[1];

index=index.replace('<button>⚙ 設定 Settings</button>','<button data-view="connections">⚙ 行情連線 Connections</button>');
if(!index.includes('data-view="connections">行情連線')) index=index.replace('<span data-view="spread">價差比較</span>','<span data-view="spread">價差比較</span><span data-view="connections">行情連線</span>');
index=index.replace('台灣指數：TX / MTX　｜　台灣指數：TX / MTX　｜　股價指數：','台灣指數：TX / MTX　｜　股價指數：');

const connectionsView=`
      <section id="connectionsView" class="view">
        <section class="connections-hero panel">
          <div><h2>行情連線 / Market Data Connections</h2><p>預設使用免費延遲或官方資料；有券商或行情帳號時，可透過自己的 Local Bridge / Private Gateway 切換至 LIVE。GitHub Pages 不儲存券商帳號、密碼、API Secret 或憑證。</p></div>
          <div class="connection-mode-box"><label><input id="preferLive" type="checkbox"> 優先使用 LIVE，失敗自動回退 DELAYED</label><span id="activeConnectionStatus" class="connection-status">免費模式</span></div>
        </section>
        <section class="market-source-grid" id="marketSourceGrid"></section>
        <article class="panel connections-panel"><div class="connections-head"><div><h3>國內券商</h3><p>主要用於 TAIFEX 即時行情。連線需透過使用者自己的本機 Bridge 或私人後端。</p></div></div><div class="broker-grid" id="domesticBrokerGrid"></div></article>
        <article class="panel connections-panel"><div class="connections-head"><div><h3>國外券商 / 行情服務</h3><p>可用於 CME、JPX / OSE、ICE 等海外期貨；實際可用市場取決於帳戶行情訂閱。</p></div></div><div class="broker-grid" id="overseasBrokerGrid"></div></article>
        <article class="panel gateway-panel">
          <div class="connections-head"><div><h3>連線設定</h3><p>只填 Gateway URL，不在此頁輸入券商密碼或 API Secret。憑證應存放在 Local Bridge / Private Backend。</p></div></div>
          <div class="gateway-form"><label>目前選擇<select id="brokerSelect"></select></label><label>Gateway URL<input id="brokerEndpoint" placeholder="例：http://127.0.0.1:8787/quotes"></label><label>備註<input id="brokerNote" placeholder="例如：家用 Mac mini / Private Worker"></label></div>
          <div class="gateway-actions"><button id="saveBrokerConnection">儲存設定</button><button id="testBrokerConnection" class="secondary-btn">測試連線</button><button id="disconnectBroker" class="secondary-btn">停用 LIVE</button><span id="brokerTestResult" class="source-note">尚未測試</span></div>
          <div class="connection-warning">安全原則：不要把券商密碼、API Secret、憑證檔或 session token 寫入 GitHub、LocalStorage 或前端 JavaScript。網站只保存 Gateway URL、偏好與非敏感備註。</div>
        </article>
      </section>
`;
if(!index.includes('id="connectionsView"')) index=index.replace('      <footer class="footer">',connectionsView+'\n      <footer class="footer">');

const connectionCode=extract(function(){/*
const CONNECTION_KEY='gmmMarketConnectionsV1';
const BROKERS={
  fubon:{name:'富邦證券 Neo',group:'domestic',markets:['TAIFEX'],mode:'Local Bridge',note:'國內期貨行情 connector 模板'},
  yuanta:{name:'元大 SPARK',group:'domestic',markets:['TAIFEX'],mode:'Local Bridge',note:'國內期貨行情 connector 模板'},
  shioaji:{name:'永豐 Shioaji',group:'domestic',markets:['TAIFEX'],mode:'Local Bridge',note:'國內期貨行情 connector 模板'},
  cathay:{name:'國泰證券',group:'domestic',markets:['TAIFEX'],mode:'Custom Bridge',note:'保留 connector 位置；依實際 API 能力設定'},
  ibkr:{name:'Interactive Brokers (IBKR)',group:'overseas',markets:['CME','JPX','ICE'],mode:'Private Gateway',note:'全球市場 connector 模板；需相應行情權限'},
  tradovate:{name:'Tradovate',group:'overseas',markets:['CME'],mode:'Private Gateway',note:'CME connector 模板'},
  custom:{name:'Custom API',group:'overseas',markets:['TAIFEX','CME','JPX','ICE'],mode:'Custom Gateway',note:'自訂統一行情 Gateway'}
};
function loadConnections(){try{return JSON.parse(localStorage.getItem(CONNECTION_KEY)||'{}')}catch{return {}}}
function saveConnections(v){localStorage.setItem(CONNECTION_KEY,JSON.stringify(v))}
function connState(){return Object.assign({preferLive:false,activeBroker:'',brokers:{}},loadConnections())}
function marketSourceRows(){const s=connState(),active=BROKERS[s.activeBroker],live=DATA?.liveMeta,liveMarkets=active?.markets||[];const row=(market,free)=>({market,free,live:live&&liveMarkets.includes(market)?(live.source||active?.name||'LIVE'):'—',status:live&&liveMarkets.includes(market)?'LIVE':free});return [row('TAIFEX','OFFICIAL DAILY'),row('CME','DELAYED'),row('JPX / OSE','DELAYED'),row('ICE','DELAYED / EOD')]}
function renderConnectionSources(){const el=$('#marketSourceGrid');if(!el)return;el.innerHTML=marketSourceRows().map(x=>`<div class="market-source-card"><span>${x.market}</span><b>${x.status}</b><small>${x.live!=='—'?x.live:x.free}</small></div>`).join('')}
function brokerCard(id,b){const s=connState(),cfg=s.brokers?.[id]||{},active=s.activeBroker===id&&s.preferLive;return `<button class="broker-card ${active?'active':''}" data-broker="${id}"><div><b>${b.name}</b><span>${b.mode}</span></div><div class="broker-markets">${b.markets.map(m=>`<em>${m}</em>`).join('')}</div><small>${cfg.endpoint?'已設定 Gateway':'未設定'} · ${b.note}</small></button>`}
function renderConnections(){if(!$('#connectionsView'))return;const s=connState();$('#preferLive').checked=!!s.preferLive;const active=BROKERS[s.activeBroker];$('#activeConnectionStatus').textContent=s.preferLive&&active?`優先 LIVE · ${active.name}`:'免費延遲 / 官方模式';$('#domesticBrokerGrid').innerHTML=Object.entries(BROKERS).filter(([,b])=>b.group==='domestic').map(([id,b])=>brokerCard(id,b)).join('');$('#overseasBrokerGrid').innerHTML=Object.entries(BROKERS).filter(([,b])=>b.group==='overseas').map(([id,b])=>brokerCard(id,b)).join('');const sel=$('#brokerSelect');sel.innerHTML=Object.entries(BROKERS).map(([id,b])=>`<option value="${id}">${b.name}</option>`).join('');sel.value=s.activeBroker||'fubon';loadBrokerForm(sel.value);$$('[data-broker]').forEach(b=>b.onclick=()=>{const st=connState();st.activeBroker=b.dataset.broker;saveConnections(st);$('#brokerSelect').value=b.dataset.broker;loadBrokerForm(b.dataset.broker);renderConnections()});renderConnectionSources()}
function loadBrokerForm(id){const s=connState(),c=s.brokers?.[id]||{};if($('#brokerEndpoint'))$('#brokerEndpoint').value=c.endpoint||'';if($('#brokerNote'))$('#brokerNote').value=c.note||'';if($('#brokerTestResult'))$('#brokerTestResult').textContent=c.lastOk?`上次成功：${new Date(c.lastOk).toLocaleString('zh-TW')}`:'尚未測試'}
function bindConnectionsUI(){if(!$('#connectionsView'))return;$('#brokerSelect').onchange=e=>loadBrokerForm(e.target.value);$('#preferLive').onchange=e=>{const s=connState();s.preferLive=e.target.checked;saveConnections(s);renderConnections();refresh()};$('#saveBrokerConnection').onclick=()=>{const id=$('#brokerSelect').value,s=connState();s.activeBroker=id;s.brokers=s.brokers||{};s.brokers[id]=Object.assign({},s.brokers[id],{endpoint:$('#brokerEndpoint').value.trim(),note:$('#brokerNote').value.trim()});saveConnections(s);renderConnections();$('#brokerTestResult').textContent='設定已儲存'};$('#disconnectBroker').onclick=()=>{const s=connState();s.preferLive=false;saveConnections(s);renderConnections();refresh()};$('#testBrokerConnection').onclick=async()=>{const id=$('#brokerSelect').value,url=$('#brokerEndpoint').value.trim(),out=$('#brokerTestResult');if(!url){out.textContent='請先填 Gateway URL';return}out.textContent='測試中…';try{const r=await fetch(url+(url.includes('?')?'&':'?')+'healthcheck=1',{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();const s=connState();s.brokers=s.brokers||{};s.brokers[id]=Object.assign({},s.brokers[id],{endpoint:url,note:$('#brokerNote').value.trim(),lastOk:new Date().toISOString()});s.activeBroker=id;saveConnections(s);out.textContent=`連線成功${j?.meta?.source?' · '+j.meta.source:''}`;renderConnections()}catch(e){out.textContent='連線失敗：'+e.message}}}
*/});
if(!app.includes("const CONNECTION_KEY='gmmMarketConnectionsV1'")) app=app.replace('let costInitialized=false;','let costInitialized=false;\n'+connectionCode);
app=app.replace("function switchView(name){$$('.view').forEach(v=>v.classList.toggle('active',v.id===name+'View'));$$('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===name));window.scrollTo({top:0,behavior:'smooth'})}","function switchView(name){$$('.view').forEach(v=>v.classList.toggle('active',v.id===name+'View'));$$('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===name));if(name==='connections')renderConnections();window.scrollTo({top:0,behavior:'smooth'})}");
app=app.replace("function bindStaticUI(){$$('[data-view]').forEach(x=>x.onclick=()=>switchView(x.dataset.view));","function bindStaticUI(){$$('[data-view]').forEach(x=>x.onclick=()=>switchView(x.dataset.view));bindConnectionsUI();");
app=app.replace('function render(){if(!DATA)return;','function render(){if(!DATA)return;renderConnectionSources();');

if(!providers.includes('function localLiveEndpoint')){
  providers=providers.replace('function mergeLive(data,live){',"function localLiveEndpoint(){try{const s=JSON.parse(localStorage.getItem('gmmMarketConnectionsV1')||'{}');if(!s.preferLive||!s.activeBroker)return '';return s.brokers?.[s.activeBroker]?.endpoint||''}catch{return ''}}\n  function mergeLive(data,live){");
  providers=providers.replace('fetchJson(c.liveEndpoint,false)','fetchJson(localLiveEndpoint()||c.liveEndpoint,false)');
}

const css=`
/* Market Data Connections */
.connections-hero{padding:16px;display:flex;justify-content:space-between;gap:18px;align-items:center}.connections-hero h2{margin:0 0 5px;font-size:20px}.connections-hero p{margin:0;color:var(--muted);max-width:820px}.connection-mode-box{display:grid;gap:8px;min-width:270px}.connection-mode-box label{font-size:12px;color:#cfe0ed}.connection-mode-box input{accent-color:var(--green)}.connection-status{display:inline-flex;width:max-content;border:1px solid #2e617f;border-radius:999px;padding:5px 9px;color:#9edaff;background:#092039;font-size:11px}.market-source-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:10px 0}.market-source-card{border:1px solid var(--line);background:linear-gradient(180deg,#0b1c2d,#0a1a29);border-radius:9px;padding:12px;display:grid;gap:3px}.market-source-card span{font-size:11px;color:var(--muted)}.market-source-card b{font-size:16px}.market-source-card small{color:#6f8da4}.connections-panel,.gateway-panel{margin-top:10px;padding-bottom:12px}.connections-head{padding:12px;border-bottom:1px solid var(--line)}.connections-head h3{margin:0;padding:0;border:0}.connections-head p{margin:4px 0 0;color:var(--muted);font-size:12px}.broker-grid{padding:12px;display:grid;grid-template-columns:repeat(3,minmax(220px,1fr));gap:9px}.broker-card{display:grid;gap:8px;text-align:left;background:#081827;border:1px solid var(--line);border-radius:8px;color:var(--text);padding:12px;cursor:pointer}.broker-card:hover,.broker-card.active{border-color:#2781bb;background:#0b263e}.broker-card>div:first-child{display:flex;justify-content:space-between;gap:8px}.broker-card span{font-size:10px;color:#7fa0b8}.broker-card small{color:#7895aa;line-height:1.4}.broker-markets{display:flex;gap:5px;flex-wrap:wrap}.broker-markets em{font-style:normal;font-size:10px;border:1px solid #2a5977;border-radius:999px;padding:3px 6px;color:#9bd6fa}.gateway-form{display:grid;grid-template-columns:220px 1fr 1fr;gap:9px;padding:12px}.gateway-form label{display:grid;gap:5px;color:var(--muted);font-size:11px}.gateway-form input,.gateway-form select{background:#061522;border:1px solid #2a4f6d;border-radius:6px;color:var(--text);padding:9px;width:100%}.gateway-actions{display:flex;gap:8px;align-items:center;padding:0 12px 12px}.gateway-actions>button:first-child{background:#0f5f91;border:1px solid #2a6a96;color:white;border-radius:6px;padding:8px 12px;cursor:pointer}.connection-warning{margin:0 12px;border:1px solid #775d24;background:rgba(255,200,87,.06);color:#e7c978;border-radius:7px;padding:9px 10px;font-size:11px}@media(max-width:1000px){.market-source-grid{grid-template-columns:repeat(2,1fr)}.broker-grid{grid-template-columns:repeat(2,1fr)}.gateway-form{grid-template-columns:1fr 1fr}}@media(max-width:700px){.connections-hero{align-items:flex-start;flex-direction:column}.connection-mode-box{min-width:0;width:100%}.market-source-grid,.broker-grid,.gateway-form{grid-template-columns:1fr}.gateway-actions{align-items:flex-start;flex-direction:column}}
`;
if(!styles.includes('/* Market Data Connections */')) styles+='\n'+css;

await fs.writeFile('index.html',index);
await fs.writeFile('app.js',app);
await fs.writeFile('providers.js',providers);
await fs.writeFile('styles.css',styles);
console.log('Applied safe Market Data Connections integration.');
