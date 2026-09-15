window.MARKET_MONITOR_CONFIG = {
  mode: 'local-json',
  endpoint: './data/latest.json',
  refreshMs: 15000,
  demoSimulation: true
};
window.addEventListener('load',()=>{
  const addCss=(href,key)=>{if(document.querySelector(`link[data-${key}]`))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;l.setAttribute(`data-${key}`,'1');document.head.appendChild(l)};
  const addScript=(src,key)=>{if(document.querySelector(`script[data-${key}]`))return;const s=document.createElement('script');s.src=src;s.setAttribute(`data-${key}`,'1');document.body.appendChild(s)};
  addCss('v1.4.css','gmm-v14');
  addCss('v1.5.css','gmm-v15');
  addScript('contract-specs.js','gmm-v14');
  setTimeout(()=>addScript('contract-months.js','gmm-v15'),100);
});