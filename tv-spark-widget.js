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
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',cleanup,{once:true});else cleanup();
})();
