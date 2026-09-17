// Inline TradingView Advanced Chart viewer for Market Overview sparklines.
(function(){
  const TV_SYMBOLS={
    'S&P 500':'SP:SPX',
    'Nasdaq-100':'NASDAQ:NDX',
    'SOX':'NASDAQ:SOX',
    '台灣加權':'TWSE:TAIEX',
    'Nikkei 225':'TVC:NI225',
    '東證 TOPIX':'TSE:TOPIX',
    '黃金 XAU/USD':'OANDA:XAUUSD',
    '白銀 XAG/USD':'OANDA:XAGUSD',
    'WTI 原油':'TVC:USOIL',
    'Brent 原油':'TVC:UKOIL',
    'USD/TWD':'FX_IDC:USDTWD',
    'USD/JPY':'FX:USDJPY',
    'EUR/USD':'FX:EURUSD'
  };
  let activeLabel='';
  let observer=null;

  function viewer(){
    let el=document.getElementById('tvSparkViewer');
    if(el)return el;
    const top=document.querySelector('.top-market-section');
    if(!top)return null;
    el=document.createElement('section');
    el.id='tvSparkViewer';
    el.className='tv-spark-viewer';
    el.hidden=true;
    el.innerHTML='<div class="tv-spark-head"><div><b id="tvSparkTitle">TradingView</b><small>TradingView · Advanced Chart</small></div><button id="tvSparkClose" type="button" aria-label="關閉 TradingView 圖表">✕ 關閉</button></div><div id="tvSparkChart" class="tv-spark-chart"></div>';
    top.appendChild(el);
    document.getElementById('tvSparkClose').addEventListener('click',closeViewer);
    return el;
  }

  function closeViewer(){
    const el=document.getElementById('tvSparkViewer');
    const chart=document.getElementById('tvSparkChart');
    if(chart)chart.replaceChildren();
    if(el)el.hidden=true;
    activeLabel='';
    document.querySelectorAll('#topCards .spark.tv-active').forEach(x=>x.classList.remove('tv-active'));
  }

  function openViewer(label,spark){
    const symbol=TV_SYMBOLS[label];
    if(!symbol)return;
    if(activeLabel===label && !document.getElementById('tvSparkViewer')?.hidden){closeViewer();return;}
    const el=viewer();
    if(!el)return;
    activeLabel=label;
    document.querySelectorAll('#topCards .spark.tv-active').forEach(x=>x.classList.remove('tv-active'));
    spark.classList.add('tv-active');
    document.getElementById('tvSparkTitle').textContent=label+' · 走勢圖';
    const chart=document.getElementById('tvSparkChart');
    chart.replaceChildren();
    const container=document.createElement('div');
    container.className='tradingview-widget-container';
    container.style.cssText='height:100%;width:100%';
    const widget=document.createElement('div');
    widget.className='tradingview-widget-container__widget';
    widget.style.cssText='height:100%;width:100%';
    container.appendChild(widget);
    const script=document.createElement('script');
    script.type='text/javascript';
    script.src='https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async=true;
    script.text=JSON.stringify({
      autosize:true,
      symbol:symbol,
      interval:'D',
      timezone:'Asia/Taipei',
      theme:'dark',
      backgroundColor:'rgba(7,20,34,1)',
      style:'1',
      locale:'zh_TW',
      hide_side_toolbar:true,
      allow_symbol_change:false,
      save_image:false,
      calendar:false,
      support_host:'https://www.tradingview.com'
    });
    chart.appendChild(container);
    container.appendChild(script);
    el.hidden=false;
    setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'nearest'}),80);
  }

  function bind(){
    const root=document.getElementById('topCards');
    if(!root)return;
    root.querySelectorAll('.card').forEach(card=>{
      const label=(card.querySelector('.label')?.textContent||'').trim();
      const spark=card.querySelector('.spark');
      if(!spark||!TV_SYMBOLS[label])return;
      spark.setAttribute('role','button');
      spark.setAttribute('tabindex','0');
      spark.setAttribute('aria-label','展開 '+label+' TradingView 走勢圖');
      spark.setAttribute('title','點擊展開 TradingView 走勢圖');
      spark.classList.add('tv-spark-trigger');
      if(spark.dataset.tvWidgetBound==='1')return;
      spark.dataset.tvWidgetBound='1';
      spark.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();openViewer(label,spark)});
      spark.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();openViewer(label,spark)}});
    });
  }

  function start(){
    viewer();
    bind();
    const root=document.getElementById('topCards');
    if(root){observer=new MutationObserver(bind);observer.observe(root,{childList:true,subtree:true});}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
