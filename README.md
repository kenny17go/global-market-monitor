# Global Market Monitor v1.1

可直接部署到 GitHub Pages 的純前端市場監控介面。

## v1.1 變更
- 移除底部 Intraday Charts 區塊。
- 最上方市場快覽可自行勾選顯示商品，設定儲存在瀏覽器 localStorage。
- 新增「價差比較 Spread」頁：TAIFEX vs 海外交易所同標的期貨。
- 價差採 Bid/Ask 計算兩個可交易方向，而不是單純 Last Price 相減。
- 預留公式警示與 Provider 可替換架構。

## 目前資料模式
`data/latest.json` 為 Demo 資料，`config.example.js` 預設會模擬小幅更新。尚未接正式即時行情。

## GitHub Pages
將此資料夾所有檔案放在 repository root，Settings → Pages → Deploy from a branch → main / root 即可。

## 後續真實資料來源規劃
- TAIFEX：台灣期貨與海外指數期貨
- NetDania：USD/TWD Offshore NDF
- Investing.com：USD/TWD Onshore Forward Points
- CME / JPX：海外期貨
- 官方央行 / 財政部：政策利率與公債曲線
