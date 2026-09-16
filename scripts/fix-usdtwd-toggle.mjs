import fs from 'node:fs/promises';

let app = await fs.readFile('app.js', 'utf8');

const toggleCode = `
function syncUsdtwdVisibility(){
  const panel=document.getElementById('usdtwdFxPanel');
  const btn=document.getElementById('toggleUsdtwdFx');
  if(!panel||!btn)return;
  let show=false;
  try{show=localStorage.getItem('gmmShowUsdtwdFx')==='1'}catch(e){}
  panel.classList.toggle('is-hidden',!show);
  btn.textContent=show?'隱藏台幣專區':'顯示台幣專區';
  btn.setAttribute('aria-expanded',show?'true':'false');
  if(btn.dataset.usdtwdBound==='1')return;
  btn.dataset.usdtwdBound='1';
  btn.addEventListener('click',function(e){
    e.preventDefault();
    const willShow=panel.classList.contains('is-hidden');
    panel.classList.toggle('is-hidden',!willShow);
    btn.textContent=willShow?'隱藏台幣專區':'顯示台幣專區';
    btn.setAttribute('aria-expanded',willShow?'true':'false');
    try{localStorage.setItem('gmmShowUsdtwdFx',willShow?'1':'0')}catch(err){}
  });
}
`;

if(!app.includes('function syncUsdtwdVisibility()')){
  app = toggleCode + '\n' + app;
}

// Ensure binding happens even if FX data is unavailable or render exits early.
if(!app.includes("document.addEventListener('DOMContentLoaded',syncUsdtwdVisibility)")){
  app += `\nif(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',syncUsdtwdVisibility)}else{syncUsdtwdVisibility()}\n`;
}

await fs.writeFile('app.js',app);
console.log('USD/TWD toggle binding installed.');
