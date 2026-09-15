# Global Market Monitor v1.0

可直接部署到 GitHub Pages 的第一版市場儀表板。

## 已完成
- Spot + Forward Points / Swap Points 合併顯示
- TWD Offshore NDF（NetDania）與 Onshore Forward（Investing.com）分開顯示，不互相校驗
- 全球股價指數 + 指數期貨合併顯示
- 商品 Spot/Reference + 商品期貨合併顯示
- Policy Rate 與美國公債殖利率曲線
- 線圖可由頁面勾選，最多同時 4 張，設定保存在瀏覽器
- 基礎公式/到價警示，例如 `GOLD/SILVER > 90`
- Responsive 版面，可在 iPhone 使用
- Provider 抽象層：之後可把 demo JSON 換成真正 API/後端

## GitHub Pages 部署
1. 建立新的 GitHub repository。
2. 將本資料夾內所有檔案上傳到 repository 根目錄。
3. GitHub → Settings → Pages。
4. Build and deployment 選 `Deploy from a branch`。
5. Branch 選 `main` / `(root)`，按 Save。
6. 等待 GitHub Pages URL 出現後即可開啟。

## 資料模式
目前 `config.example.js` 預設：

```js
window.MARKET_MONITOR_CONFIG = {
  mode: 'local-json',
  endpoint: './data/latest.json',
  refreshMs: 15000,
  demoSimulation: true
};
```

`demoSimulation: true` 會讓數字產生小幅波動，方便測試線圖與警示。
正式接行情後請改為 `false`。

## 真實資料的建議架構
GitHub Pages 是純前端，不適合直接存放 API 金鑰，也可能遇到 CORS / 授權問題。因此正式版建議：

```
TAIFEX / NetDania / Investing.com / CME / JPX / 官方利率資料
                      ↓
            Serverless Proxy / Worker
                      ↓
               統一 JSON endpoint
                      ↓
             GitHub Pages 前端
```

前端只需要維持與 `data/latest.json` 相同的 JSON schema，即可不改畫面直接換資料來源。

## 第一版行情來源規劃
- TAIEX / TX / MTX / TMF：TAIFEX
- TWD Offshore NDF：NetDania
- TWD Onshore Forward Points：Investing.com
- 主要 G7 FX Spot / Forward Points：Provider adapter
- SPX / ES、NDX / NQ、SOX / SOX futures：美國指數 / CME
- TAIEX / TX：TAIFEX
- Nikkei / Nikkei futures、TOPIX / TOPIX futures：JPX/OSE
- Gold / GC、Silver / SI、WTI / CL、Brent、Copper / HG、Natural Gas / NG
- 政策利率、公債殖利率：央行 / 政府官方來源優先

## 注意
目前 `data/latest.json` 為示範資料，不是即時市場報價。V1 的目的先確立 UI、資料結構、線圖選擇、公式與通知流程。
