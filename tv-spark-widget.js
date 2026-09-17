// TradingView dashboard chart viewer. TVC is preferred where TradingView exposes a TVC feed;
// exchange/provider symbols are used where no TVC equivalent is verified. This changes charts only,
// never the dashboard's numeric/raw data sources (TWD forward/NDF, TAIFEX, official rates, etc.).
(function(){
  const TV_SYMBOLS={
    'S&P 500':'TVC:SPX','Nasdaq-100':'TVC:NDX','SOX':'TVC:SOX','SOX 費半':'TVC:SOX',
    '日經 225':'TVC:NI225','東證 TOPIX':'TVC:TOPIX',
    'USD/TWD':'FX_IDC:USDTWD','EUR/USD':'FX:EURUSD','GBP/USD':'FX:GBPUSD','USD/JPY':'FX:USDJPY','AUD/USD':'FX:AUDUSD','USD/CNH':'FX_IDC:USDCNH',
    '黃金':'TVC:GOLD','黃金期貨 MGC':'COMEX:MGC1!','白銀':'TVC:SILVER','WTI 原油':'TVC:USOIL','Brent 原油':'TVC:UKOIL','銅':'TVC:COPPER','天然氣':'TVC:NATGAS',
    '2Y':'TVC:US02Y','5Y':'TVC:US05Y','10Y':'TVC:US10Y','30Y':'TVC:US30Y'
  };
  let activeKey='';
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  function symbolFor(label){const x=clean(label);if(TV_SYMBOLS[x])return TV_SYMBOLS[x];for(const [k,v] of Object.entries(TV_SYMBOLS))if(x.includes(k))return v;return null}
  function viewer(){let el=document.getElementById('tvSparkViewer');if(el)return el;const top=document.querySelector('.top-market-section');if(!top)return null;el=document.createElement('section');el.id='tvSparkViewer';el.className='tv-spark-viewer';el.hidden=true;el.innerHTML='<div class="tv-spark-head"><div><b id="tvSparkTitle">TradingView</b><small>TradingView · 市場走勢圖（僅圖表層，不取代原始報價來源）</small></div><button id="tvSparkClose" type="button">✕ 關閉</button></div><div id="tvSparkChart" class="tv-spark-chart"></div>';top.appendChild(el);document.getElementById('tvSparkClose').addEventListener('click',closeViewer);return el}
  function clearActive(){document.querySelectorAll('.tv-active').forEach(x=>x.classList.remove('tv-active'))}
  function closeViewer(){const el=document.getElementById('tvSparkViewer'),chart=document.getElementById('tvSparkChart');if(chart)chart.replaceChildren();if(el)el.hidden=true;activeKey='';clearActive()}
  function openViewer(label,trigger){const symbol=symbolFor(label);if(!symbol)return;const key=label+'|'+symbol,el=viewer();if(!el)return;if(activeKey===key&&!el.hidden){closeViewer();return}activeKey=key;clearActive();if(trigger)trigger.classList.add('tv-active');document.getElementById('tvSparkTitle').textContent=label+' · '+symbol+' · 走勢圖';const chart=document.getElementById('tvSparkChart');chart.replaceChildren();const container=document.createElement('div');container.className='tradingview-widget-container';container.style.cssText='height:100%;width:100%';const widget=document.createElement('div');widget.className='tradingview-widget-container__widget';widget.style.cssText='height:100%;width:100%';container.appendChild(widget);const script=document.createElement('script');script.type='text/javascript';script.src='https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';script.async=true;script.innerHTML=JSON.stringify({symbols:[[label,symbol+'|1D']],chartOnly:true,width:'100%',height:'100%',locale:'zh_TW',colorTheme:'dark',autosize:true,showVolume:false,showMA:false,hideDateRanges:false,hideMarketStatus:true,hideSymbolLogo:false,scalePosition:'right',scaleMode:'Normal',fontSize:'10',noTimeScale:false,valuesTracking:'1',changeMode:'price-and-percent',chartType:'area',lineWidth:2,lineType:0,dateRanges:['1d|5','5d|15','1m|60','3m|1D','12m|1D','60m|1W','all|1M']});chart.appendChild(container);container.appendChild(script);el.hidden=false;setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'nearest'}),80)}
  function arm(el,label){const symbol=symbolFor(label);if(!el||!symbol)return;el.classList.add('tv-spark-trigger');el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('title','點擊展開 '+label+' TradingView 走勢圖');if(el.dataset.tvWidgetBound==='1')return;el.dataset.tvWidgetBound='1';el.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();openViewer(label,el)});el.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();openViewer(label,el)}})}
  function bind(){
    document.querySelectorAll('#topCards .card').forEach(card=>{const label=clean(card.querySelector('.label')?.textContent);arm(card.querySelector('.spark')||card,label)});
    document.querySelectorAll('#fxBody tr').forEach(tr=>{const c=tr.cells?.[0];arm(c,clean(c?.textContent))});
    document.querySelectorAll('#eqBody tr').forEach(tr=>{const c=tr.cells?.[0];arm(c,clean(c?.textContent))});
    document.querySelectorAll('#cmdBody tr').forEach(tr=>{const c=tr.cells?.[0];arm(c,clean(c?.textContent))});
    const tenors=[...document.querySelectorAll('#ustYieldTenors th, #ustYieldTenors td')],vals=[...document.querySelectorAll('#ustYieldValues td, #ustYieldValues th')];tenors.forEach((c,i)=>{const label=clean(c.textContent);arm(c,label);if(vals[i])arm(vals[i],label)});
  }
  function start(){viewer();bind();const roots=['topCards','fxBody','eqBody','cmdBody','ustYieldTenors','ustYieldValues'];roots.forEach(id=>{const root=document.getElementById(id);if(root)new MutationObserver(bind).observe(root,{childList:true,subtree:true})})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
