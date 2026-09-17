// TradingView core-index viewer. Keep scope intentionally limited until these three are verified.
(function(){
  // Use TradingView-calculated TVC symbols for embedded charts. TradingView documents
  // TVC:SPX as the freely available counterpart to SP:SPX; TVC also avoids the
  // exchange/data entitlement dialog seen with SP:/NASDAQ: index feeds in embeds.
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
    el.innerHTML='<div class="tv-spark-head"><div><b id="tvSparkTitle">TradingView</b><small>TradingView · Advanced Chart · TVC 指數走勢</small></div><button id="tvSparkClose" type="button">✕ 關閉</button></div><div id="tvSparkChart" class="tv-spark-chart"></div>';
    top.appendChild(el);
    document.getElementById('tvSparkClose').addEventListener('click',closeViewer);
    return el;
  }

  function clearActive(){document.querySelectorAll('.tv-active').forEach(x=>x.classList.remove('tv-active'))}
  function closeViewer(){
    const el=document.getElementById('tvSparkViewer'),chart=document.getElementById('tvSparkChart');
    if(chart)chart.replaceChildren();if(el)el.hidden=true;activeKey='';clearActive();
  }

  function widgetDocument(symbol){
    const config={autosize:true,symbol:symbol,interval:'D',timezone:'Asia/Taipei',theme:'dark',backgroundColor:'rgba(7,20,34,1)',style:'1',locale:'zh_TW',hide_side_toolbar:true,allow_symbol_change:false,save_image:false,calendar:false,support_host:'https://www.tradingview.com'};
    const safe=JSON.stringify(config).replace(/</g,'\\u003c');
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,.tradingview-widget-container,.tradingview-widget-container__widget{width:100%;height:100%;margin:0;overflow:hidden;background:#071422}</style></head><body><div class="tradingview-widget-container"><div class="tradingview-widget-container__widget"></div><script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>'+safe+'<\/script></div></body></html>';
  }

  function openViewer(label,trigger){
    const symbol=TV_SYMBOLS[label];if(!symbol)return;
    const key=label+'|'+symbol,el=viewer();if(!el)return;
    if(activeKey===key&&!el.hidden){closeViewer();return}
    activeKey=key;clearActive();if(trigger)trigger.classList.add('tv-active');
    document.getElementById('tvSparkTitle').textContent=label+' · '+symbol+' · 走勢圖';
    const chart=document.getElementById('tvSparkChart');chart.replaceChildren();
    const frame=document.createElement('iframe');
    frame.title=label+' TradingView chart';
    frame.setAttribute('loading','eager');
    frame.setAttribute('referrerpolicy','no-referrer-when-downgrade');
    frame.style.cssText='border:0;width:100%;height:100%;display:block;background:#071422';
    frame.srcdoc=widgetDocument(symbol);
    chart.appendChild(frame);el.hidden=false;
    setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'nearest'}),80);
  }

  function arm(el,label){
    if(!el||!TV_SYMBOLS[label])return;
    el.classList.add('tv-spark-trigger');el.setAttribute('role','button');el.setAttribute('tabindex','0');
    el.setAttribute('title','點擊展開 '+label+' TradingView 走勢圖');
    if(el.dataset.tvWidgetBound==='1')return;
    el.dataset.tvWidgetBound='1';
    el.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();openViewer(label,el)});
    el.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();openViewer(label,el)}});
  }
  function bind(){
    document.querySelectorAll('#topCards .card').forEach(card=>{
      const label=(card.querySelector('.label')?.textContent||'').trim();
      arm(card.querySelector('.spark'),label);
    });
  }
  function start(){viewer();bind();const root=document.getElementById('topCards');if(root)new MutationObserver(bind).observe(root,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
