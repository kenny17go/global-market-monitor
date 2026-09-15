# Global Market Monitor v1.5

## v1.5
- 依目前日期自動產生各商品可交易的合約月份。
- TAIFEX / CME / JPX / ICE 自動尋找同月份合約。
- 若沒有完全相同月份，顯示最近可比月份與月份差。
- 合約月份改為下拉選單，仍可手動切換比較月份。
- 商品切換或恢復官方預設時，會重新自動配對。
- 目前月份規則依交易所掛牌週期產生；正式行情接入後，會再由即時/官方合約清單覆蓋推算結果。

## v1.4
- Contract & Cost Lab 現在會依選定商品自動帶入交易所官方規格預設。
- 自動欄位：合約乘數、交易幣別、Tick、掛牌/到期週期、部分報價方向。
- 內建 TWD 換算：USD、JPY、CNH、GBP、EUR、AUD 會由 Dashboard FX 示範資料換算。
- USD/JPY vs CME 6J 會自動以倒數正規化價格方向。
- TGF vs COMEX Gold 與 BRF vs ICE Brent 會自動套入價格單位/幣別換算。
- 所有規格仍可手動覆寫，以方便測試特殊月份或券商實際成本。

GitHub Pages ready market dashboard prototype.

## v1.3
- Top market cards remain user-selectable.
- Cross-market page is now a categorized product catalog instead of fixed spread pairs.
- Covers comparable TAIFEX products in foreign equity indices, FX, gold and Brent crude.
- Formula Lab allows arbitrary Bid / Ask / Last formulas with + - * /, parentheses and comparisons.
- Quote-direction and currency/unit conversions are intentionally user-controlled.
- Demo quotes only; providers remain replaceable before live deployment.

### Catalog
Equity indices: TJF, UDF, SPF, UNF, SXF, F1F.
FX: RHF, XEF, XJF, XBF, XAF.
Metals: GDF, TGF.
Energy: BRF.

RTF (CNT fixing) is not treated as identical to offshore CNH for direct cross-exchange comparison.

## v1.3 cost lab
- 新增 Contract & Cost Lab：到期月份、Bid/Ask/Last、合約乘數、口數、單位換算、FX 換算。
- 可輸入台期所成本、海外成本、稅/FX/其他成本。
- 顯示換算後價格價差、每點價值避險比、雙邊名目金額與成本後名目差額。
- Formula Lab 保留，可與成本工具並用。

注意：成本後名目差額不等同套利獲利，正式行情接入後仍須對齊月份、合約規格與實際 Bid/Ask。