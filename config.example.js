window.MARKET_MONITOR_CONFIG = {
  mode: 'local-json',
  endpoint: './data/latest.json',
  refreshMs: 15000,
  demoSimulation: true
};

(()=>{
  const addCss=(href,key)=>{
    if(document.querySelector(`link[data-${key}]`))return;
    const l=document.createElement('link');l.rel='stylesheet';l.href=href;l.setAttribute(`data-${key}`,'1');document.head.appendChild(l);
  };
  const loadScript=(src,key)=>new Promise(resolve=>{
    if(document.querySelector(`script[data-${key}]`))return resolve();
    const s=document.createElement('script');s.src=src;s.async=true;s.setAttribute(`data-${key}`,'1');s.onload=resolve;s.onerror=resolve;document.body.appendChild(s);
  });

  // Add CSS in one batch to avoid multiple layout waves after window.load.
  addCss('v1.4.css','gmm-v14');
  addCss('v1.5.css','gmm-v15');
  addCss('v1.6.css','gmm-v16');

  // Start fetching immediately and preserve dependency order without staggered timers.
  Promise.resolve()
    .then(()=>loadScript('contract-specs.js','gmm-v14'))
    .then(()=>loadScript('contract-months.js','gmm-v15'))
    .then(()=>loadScript('display-format.js','gmm-format'))
    .then(()=>loadScript('custom-products.js','gmm-v16'));
})();