import fs from 'node:fs/promises';
let index=await fs.readFile('index.html','utf8');
index=index.replace('Onshore Forward · Investing.com','Onshore Taipei · Investing / Cbonds');
index=index.replace('<th>NetDania − Onshore</th>','<th>Cross-market spread</th>');
index=index.replace('Forward points 與 outright 皆以各來源原始報價計算；來源暫時無法取得或報價驗證失敗時顯示「—」，不使用模擬值補齊。NetDania 市場屬性確認前不標示為境內或境外。','Onshore Taipei：Investing.com 盤中 Forward Points 優先；無法取得時使用 Cbonds Taipei DAILY outright benchmark。NetDania 市場屬性確認前不標示境內或境外，也不計算跨市場 spread。');
await fs.writeFile('index.html',index);
console.log('Patched FX V1.1 labels.');
