// Inline TradingView Advanced Chart viewer for Market Overview, FX, commodities and UST yields.
(function(){
  const TV_SYMBOLS={
    'S&P 500':'SP:SPX','Nasdaq-100':'NASDAQ:NDX','SOX':'NASDAQ:SOX','SOX 費半':'NASDAQ:SOX',
    '台灣加權':'TWSE:TAIEX','Nikkei 225':'TVC:NI225','日經 225':'TVC:NI225','東證 TOPIX':'TSE:TOPIX',
    '黃金 XAU/USD':'OANDA:XAUUSD','黃金':'OANDA:XAUUSD','白銀 XAG/USD':'OANDA:XAGUSD','白銀':'OANDA:XAGUSD',
    'WTI 原油':'TVC:USOIL','WTI':'TVC:USOIL','Brent 原油':'TVC:UKOIL','Brent':'TVC:UKOIL',
    'USD/TWD':'FX_IDC:USDTWD','USD/JPY':'FX:USDJPY','EUR/USD':'FX:EURUSD','GBP/USD':'FX:GBPUSD','AUD/USD':'FX:AUDUSD','USD/CNH':'FX_IDC:USDCNH',
    '2Y':'TVC:US02Y','5Y':'TVC:US05Y','10Y':'TVC:US10Y','30Y':'TVC:US30Y'
  };
  let activeKey='';

  function viewer(){
    let el=document.getElementById('tvSparkViewer');
    if(el)return el;
    const top=document.querySelector('.top-market-section');
    if(!top)return null;
    el=document.createElement('section');el.id='tvSparkViewer';el.className='tv-spark-viewer';el.hidden=true;
    el.innerHTML='<div class="tv-spark-head"><div><b id="tvSparkTitle">TradingView</b><small>TradingView · Advanced Chart · 圖表補充，不取代原始數值來源</small></div><button id="tvSparkClose" type="button" aria-label="關閉 TradingView 圖表">✕ 關閉</button></div><div id="tvSparkChart" class="tv-spark-chart"></div>';
    top.appendChild(el);document.getElementById('tvSparkClose').addEventListener('click',closeViewer);return el;
  }
  function clearActive(){document.querySelectorAll('.tv-active').forEach(x=>x.classList.remove('tv-active'))}
  function closeViewer(){const el=document.getElementById('tvSparkViewer'),chart=document.getElementById('tvSparkChart');if(chart)chart.replaceChildren();if(el)el.hidden=true;activeKey='';clearActive()}
  function openViewer(label,trigger){
    const symbol=TV_SYMBOLS[label];if(!symbol)return;
    const key=label+'|'+symbol,el=viewer();if(!el)return;
    if(activeKey===key&&!el.hidden){closeViewer();return}
    activeKey=key;clearActive();if(trigger)trigger.classList.add('tv-active');
    document.getElementById('tvSparkTitle').textContent=label+' · 走勢圖';
    const chart=document.getElementById('tvSparkChart');chart.replaceChildren();
    const container=document.createElement('div');container.className='tradingview-widget-container';container.style.cssText='height:100%;width:100%';
    const widget=document.createElement('div');widget.className='tradingview-widget-container__widget';widget.style.cssText='height:100%;width:100%';container.appendChild(widget);
    const script=document.createElement('script');script.type='text/javascript';script.src='https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';script.async=true;
    script.text=JSON.stringify({autosize:true,symbol,interval:'D',timezone:'Asia/Taipei',theme:'dark',backgroundColor:'rgba(7,20,34,1)',style:'1',locale:'zh_TW',hide_side_toolbar:true,allow_symbol_change:false,save_image:false,calendar:false,support_host:'https://www.tradingview.com'});
    chart.appendChild(container);container.appendChild(script);el.hidden=false;setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'nearest'}),80);
  }
  function arm(el,label){if(!el||!TV_SYMBOLS[label])return;el.classList.add('tv-spark-trigger');el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('title','點擊展開 '+label+' TradingView 走勢圖');el.setAttribute('aria-label','展開 '+label+' TradingView 走勢圖');if(el.dataset.tvWidgetBound==='1')return;el.dataset.tvWidgetBound='1';el.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();openViewer(label,el)});el.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();openViewer(label,el)}})}
  function bindTop(){document.querySelectorAll('#topCards .card').forEach(card=>{const label=(card.querySelector('.label')?.textContent||'').trim();arm(card.querySelector('.spark'),label)})}
  function bindRows(rootId){document.querySelectorAll('#'+rootId+' tr').forEach(row=>{const label=(row.cells?.[0]?.textContent||'').trim();if(TV_SYMBOLS[label])arm(row.cells[0],label)})}
  function bindUst(){const heads=[...document.querySelectorAll('#ustYieldTenors th')],vals=[...document.querySelectorAll('#ustYieldValues td')];heads.forEach((th,i)=>{const tenor=(th.textContent||'').trim();if(TV_SYMBOLS[tenor]){arm(th,tenor);if(vals[i])arm(vals[i],tenor)}})}
  function bind(){bindTop();bindRows('fxBody');bindRows('eqBody');bindRows('cmdBody');bindUst()}
  function start(){viewer();bind();const roots=['topCards','fxBody','eqBody','cmdBody','ustYieldTenors','ustYieldValues'].map(id=>document.getElementById(id)).filter(Boolean);roots.forEach(root=>new MutationObserver(bind).observe(root,{childList:true,subtree:true}))}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
