window.MARKET_MONITOR_CONFIG = {
  mode: 'local-json',
  endpoint: './data/latest.json',
  refreshMs: 15000,
  demoSimulation: true
};
window.addEventListener('load',()=>{
  if(!document.querySelector('link[data-gmm-v14]')){const l=document.createElement('link');l.rel='stylesheet';l.href='v1.4.css';l.dataset.gmmV14='1';document.head.appendChild(l);}
  if(!document.querySelector('script[data-gmm-v14]')){const s=document.createElement('script');s.src='contract-specs.js';s.dataset.gmmV14='1';document.body.appendChild(s);}
});
