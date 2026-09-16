import fs from 'node:fs/promises';

let index=await fs.readFile('index.html','utf8');
let app=await fs.readFile('app.js','utf8');
let css=await fs.readFile('styles.css','utf8');

const PASS='GMM2026';

if(!index.includes('id="screenLock"')){
  index=index.replace('<body>','<body>\n<div id="screenLock" class="screen-lock" aria-modal="true" role="dialog">\n  <div class="screen-lock-card">\n    <div class="screen-lock-brand">Global Market Monitor</div>\n    <h2>私人檢視</h2>\n    <p>請輸入密碼後進入。</p>\n    <input id="screenLockPassword" type="password" autocomplete="current-password" placeholder="輸入密碼">\n    <button id="screenLockSubmit" type="button">進入 Dashboard</button>\n    <div id="screenLockError" class="screen-lock-error"></div>\n    <small>此版本僅為前端畫面遮罩，不是真正的伺服器端存取控制。</small>\n  </div>\n</div>');
}

if(!app.includes("const SCREEN_LOCK_PASS='GMM2026'")){
  const js=`\nconst SCREEN_LOCK_PASS='${PASS}';\nfunction initScreenLock(){\n  const lock=document.getElementById('screenLock');\n  if(!lock)return;\n  const input=document.getElementById('screenLockPassword');\n  const btn=document.getElementById('screenLockSubmit');\n  const err=document.getElementById('screenLockError');\n  const unlocked=sessionStorage.getItem('gmmScreenUnlocked')==='1';\n  document.body.classList.toggle('screen-locked',!unlocked);\n  lock.classList.toggle('is-unlocked',unlocked);\n  if(unlocked)return;\n  setTimeout(()=>input?.focus(),120);\n  const submit=()=>{\n    if(input?.value===SCREEN_LOCK_PASS){sessionStorage.setItem('gmmScreenUnlocked','1');document.body.classList.remove('screen-locked');lock.classList.add('is-unlocked');if(err)err.textContent='';}\n    else{if(err)err.textContent='密碼錯誤，請再試一次';if(input){input.value='';input.focus();}}\n  };\n  if(btn)btn.onclick=submit;\n  if(input)input.addEventListener('keydown',e=>{if(e.key==='Enter')submit()});\n}\n`;
  app=app.replace('function quoteDecimals(code){',js+'\nfunction quoteDecimals(code){');
  app=app.replace('bindStaticUI();','initScreenLock();bindStaticUI();');
}

if(!css.includes('/* screen-lock-demo */')) css+=`\n/* screen-lock-demo */\n.screen-lock{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:24px;background:rgba(3,10,18,.96);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);transition:opacity .22s ease,visibility .22s ease}\n.screen-lock.is-unlocked{opacity:0;visibility:hidden;pointer-events:none}.screen-lock-card{width:min(420px,92vw);padding:28px;border-radius:18px;border:1px solid rgba(135,167,194,.22);background:linear-gradient(180deg,rgba(15,34,50,.98),rgba(8,21,33,.98));box-shadow:0 26px 80px rgba(0,0,0,.45)}\n.screen-lock-brand{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#7fa4c1;margin-bottom:18px}.screen-lock-card h2{margin:0 0 8px;font-size:26px}.screen-lock-card p{margin:0 0 18px;color:var(--muted,#8fa3b8)}\n.screen-lock-card input{width:100%;box-sizing:border-box;margin-bottom:10px;padding:13px 14px;border-radius:10px;border:1px solid var(--line,#243447);background:#071422;color:#eef6fb;font-size:16px}.screen-lock-card button{width:100%;padding:12px 14px;border-radius:10px;font-weight:700}.screen-lock-error{min-height:20px;margin-top:10px;color:#ff9b9b}.screen-lock-card small{display:block;margin-top:10px;color:var(--muted,#8fa3b8);line-height:1.5}.screen-locked .app{filter:blur(8px);pointer-events:none;user-select:none}\n`;

index=index.replace(/app\.js\?v=[^\"']+/,'app.js?v=20260916-lockdemo1');
await fs.writeFile('index.html',index);
await fs.writeFile('app.js',app);
await fs.writeFile('styles.css',css);
console.log('Screen lock demo installed.');
