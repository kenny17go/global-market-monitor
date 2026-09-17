// TradingView core-index viewer. Scope intentionally limited to S&P 500, Nasdaq-100 and SOX.
(function(){
  // Use TradingView's TVC index feeds for a market-price chart instead of the broader
  // FRED economic-series view. Keep the compact Symbol Overview viewer.
  const TV_SYMBOLS={
    'S&P 500':'TVC:SPX',
    'Nasdaq-100':'TVC:NDX',
    'SOX':'TVC:SOX',
    'SOX 費半':'TVC:SOX'
  };
  let activeKey='';

  function viewer(){
    let el=document.getElementById('tvSparkViewer');
    if(el)return el;
    const top=document.querySelector('.top-market-section');
    if(!top)return null;
    el=document.createElement('section');
    el.id='tvSparkViewer';el.className='tv-spark-viewer';el.hidden=true;
    el.innerHTML='<div class="tv-spark-head"><div><b id="tvSparkTitle">TradingView</b><small>TradingView · Symbol Overview · 指數走勢</small></div><button id="tvSparkClose" type="button">✕ 關閉</button></div><div id="tvSparkChart" class="tv-spark-chart"></div>';
    top.appendChild(el);
    document.getElementById('tvSparkClose').addEventListener('click',closeViewer);
    return el;
  }
  function clearActive(){document.querySelectorAll('.tv-active').forEach(x=>x.classList.remove('tv-active'))}
  function closeViewer(){const el=document.getElementById('tvSparkViewer'),chart=document.getElementById('tvSparkChart');if(chart)chart.replaceChildren();if(el)el.hidden=true;activeKey='';clearActive()}

  function openViewer(label,trigger){
    const symbol=TV_SYMBOLS[label];if(!symbol)return;
    const key=label+'|'+symbol,el=viewer();if(!el)return;
    if(activeKey===key&&!el.hidden){closeViewer();return}
    activeKey=key;clearActive();if(trigger)trigger.classList.add('tv-active');
    document.getElementById('tvSparkTitle').textContent=label+' · '+symbol+' · 走勢圖';
    const chart=document.getElementById('tvSparkChart');chart.replaceChildren();
    const container=document.createElement('div');container.className='tradingview-widget-container';container.style.cssText='height:100%;width:100%';
    const widget=document.createElement('div');widget.className='tradingview-widget-container__widget';widget.style.cssText='height:100%;width:100%';container.appendChild(widget);
    const script=document.createElement('script');script.type='text/javascript';script.src='https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';script.async=true;
    script.innerHTML=JSON.stringify({symbols:[[label,symbol+'|1D']],chartOnly:true,width:'100%',height:'100%',locale:'zh_TW',colorTheme:'dark',autosize:true,showVolume:false,showMA:false,hideDateRanges:false,hideMarketStatus:true,hideSymbolLogo:false,scalePosition:'right',scaleMode:'Normal',fontSize:'10',noTimeScale:false,valuesTracking:'1',changeMode:'price-and-percent',chartType:'area',lineWidth:2,lineType:0,dateRanges:['1d|1','1m|1D','3m|1D','12m|1D','60m|1W','all|1M']});
    chart.appendChild(container);container.appendChild(script);el.hidden=false;
    setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'nearest'}),80);
  }

  function arm(el,label){
    if(!el||!TV_SYMBOLS[label])return;
    el.classList.add('tv-spark-trigger');el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('title','點擊展開 '+label+' TradingView 走勢圖');
    if(el.dataset.tvWidgetBound==='1')return;el.dataset.tvWidgetBound='1';
    el.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();openViewer(label,el)});
    el.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();openViewer(label,el)}});
  }
  function bind(){document.querySelectorAll('#topCards .card').forEach(card=>{const label=(card.querySelector('.label')?.textContent||'').trim();arm(card.querySelector('.spark'),label)})}
  function start(){viewer();bind();const root=document.getElementById('topCards');if(root)new MutationObserver(bind).observe(root,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
