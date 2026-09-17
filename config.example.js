window.MARKET_MONITOR_CONFIG = {
  mode: 'local-json',
  endpoint: './data/latest.json',
  refreshMs: 15000,
  demoSimulation: false,
  liveEndpoint: '' // Licensed backend gateway for CME / JPX / ICE; never put exchange API keys in GitHub Pages
};

// v1.6.2: keep original overview sparklines and add an explicit TradingView link.
(function(){
  const TV_LINKS={
    'S&P 500':'https://tw.tradingview.com/symbols/SP-SPX/',
    'Nasdaq-100':'https://tw.tradingview.com/symbols/NASDAQ-NDX/',
    'SOX':'https://tw.tradingview.com/symbols/NASDAQ-SOX/',
    '台灣加權':'https://tw.tradingview.com/symbols/TWSE-TAIEX/',
    'Nikkei 225':'https://tw.tradingview.com/symbols/TVC-NI225/',
    '東證 TOPIX':'https://tw.tradingview.com/symbols/TSE-TOPIX/',
    '黃金 XAU/USD':'https://tw.tradingview.com/symbols/XAUUSD/',
    '白銀 XAG/USD':'https://tw.tradingview.com/symbols/XAGUSD/',
    'WTI 原油':'https://tw.tradingview.com/symbols/TVC-USOIL/',
    'Brent 原油':'https://tw.tradingview.com/symbols/BRENT/',
    'USD/TWD':'https://tw.tradingview.com/symbols/USDTWD/?exchange=FX_IDC',
    'USD/JPY':'https://tw.tradingview.com/symbols/USDJPY/',
    'EUR/USD':'https://tw.tradingview.com/symbols/EURUSD/'
  };
  function wireTradingViewLinks(){
    const root=document.getElementById('topCards');
    if(!root)return;
    root.querySelectorAll('.card').forEach(function(card){
      const label=(card.querySelector('.label')?.textContent||'').trim();
      const spark=card.querySelector('.spark');
      const url=TV_LINKS[label];
      if(!spark||!url)return;
      spark.setAttribute('role','link');
      spark.setAttribute('tabindex','0');
      spark.setAttribute('aria-label','在 TradingView 開啟 '+label+' 完整走勢圖');
      spark.setAttribute('title','點擊前往 TradingView 完整走勢圖');
      spark.style.cursor='pointer';
      spark.style.borderRadius='6px';
      spark.style.touchAction='manipulation';
      if(spark.dataset.tvBound!=='1'){
        spark.dataset.tvBound='1';
        const open=function(ev){
          ev.preventDefault();
          ev.stopPropagation();
          window.location.href=url;
        };
        spark.addEventListener('click',open);
        spark.addEventListener('keydown',function(ev){if(ev.key==='Enter'||ev.key===' '){open(ev)}});
      }
      let link=card.querySelector('.tv-direct-link');
      if(!link){
        link=document.createElement('a');
        link.className='tv-direct-link';
        link.textContent='TradingView 完整圖表 ↗';
        link.href=url;
        link.target='_self';
        link.rel='noopener noreferrer';
        link.style.cssText='display:inline-block;margin-top:5px;font-size:11px;color:#79bfff;text-decoration:none;position:relative;z-index:5;';
        const meta=card.querySelector('.spark-meta');
        if(meta)meta.insertAdjacentElement('afterend',link);else spark.insertAdjacentElement('afterend',link);
      }else link.href=url;
    });
  }
  function start(){
    const root=document.getElementById('topCards');
    if(!root)return;
    wireTradingViewLinks();
    new MutationObserver(wireTradingViewLinks).observe(root,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
  else start();
})();
