# CME / JPX / ICE LIVE data gateway

The GitHub Pages frontend must not contain exchange credentials or vendor API keys.

`providers.js` accepts an optional backend URL in `config.example.js`:

```js
window.MARKET_MONITOR_CONFIG = {
  mode: 'local-json',
  endpoint: './data/latest.json',
  refreshMs: 15000,
  demoSimulation: false,
  liveEndpoint: 'https://YOUR-BACKEND.example.com/market/live'
};
```

The backend can use licensed CME, JPX/OSE and ICE data and normalize it to this schema:

```json
{
  "meta": {
    "mode": "LIVE",
    "generatedAt": "2026-09-16T06:00:00+08:00"
  },
  "quotes": {
    "CME_MES": {
      "source": "CME licensed feed",
      "defaultMonth": "202612",
      "contracts": [
        {
          "month": "202612",
          "bid": 6000.00,
          "ask": 6000.25,
          "last": 6000.25,
          "timestamp": "2026-09-16T06:00:00.000Z"
        }
      ]
    },
    "CME_MNQ": {
      "source": "CME licensed feed",
      "defaultMonth": "202612",
      "contracts": []
    },
    "JPX_MINI_TOPIX": {
      "source": "OSE licensed feed",
      "defaultMonth": "202612",
      "contracts": []
    },
    "ICE_BRENT_MINI": {
      "source": "ICE licensed feed",
      "defaultMonth": "202611",
      "contracts": []
    }
  }
}
```

Supported identifiers currently include `CME_MES`, `CME_MNQ`, `CBOT_MYM`, `CME_SOX`, `CME_CNH`, `CME_6E`, `CME_6J`, `CME_6B`, `CME_6A`, `COMEX_MGC`, `COMEX_MGC_TWD`, `JPX_MINI_TOPIX`, `JPX_NIKKEI225_MINI`, `ICE_Z`, and `ICE_BRENT_MINI`.

When a LIVE quote exists, the frontend replaces the placeholder overseas Bid / Ask / Last and contract-month list with the licensed feed values. TAIFEX continues to use `data/taifex-latest.json` until a licensed TAIFEX streaming provider is configured.

## Licensing note

CME real-time top-of-book is available through CME Group's Real-Time Futures & Options Data API. OSE/JPX real-time derivatives data requires the applicable market-information agreement or an authorized provider. ICE real-time futures data is distributed under ICE market-data licensing / authorized vendor arrangements. Do not scrape or publicly redistribute exchange real-time data without the applicable rights.
