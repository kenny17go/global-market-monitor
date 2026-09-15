# Global Market Monitor v1.3

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

### Contract & Cost Lab
- 到期月份、Bid/Ask/Last、合約乘數、口數、單位換算、FX 換算。
- 可輸入台期所成本、海外成本、稅/FX/其他成本。
- 顯示換算後價格價差、每點價值避險比、雙邊名目金額與成本後名目差額。
- Formula Lab 保留，可與成本工具並用。

注意：成本後名目差額不等同套利獲利，正式行情接入後仍須對齊月份、合約規格與實際 Bid/Ask。
