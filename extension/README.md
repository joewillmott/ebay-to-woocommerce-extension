# eBay Product Collector Extension

## Key components

| File | Responsibility |
| ---- | -------------- |
| `manifest.json` | Declares MV3 permissions (`activeTab`, `tabs`, `scripting`, `storage`, `notifications`) and wires the popup, options page, and background service worker. |
| `scripts/background.js` | Enables/disables the action icon on valid eBay URLs, injects the scraper, stores WooCommerce credentials, and proxies import requests to the WordPress endpoint. |
| `scripts/content-script.js` | Runs inside the eBay product page, reading the item ID, title, HTML description, images, price, currency, stock quantity, and stock status directly from the DOM. |
| `popup/popup.*` | Provides the editing UI and orchestrates scrape → edit → import. |
| `options/options.*` | Stores the WooCommerce endpoint URL and API key in `chrome.storage.sync`. |

## Data payload structure

Every import sends a JSON object shaped like this:

```json
{
  "itemId": "1234567890",
  "sourceUrl": "https://www.ebay.co.uk/itm/1234567890",
  "title": "Dining Table",
  "descriptionHtml": "<p>Full HTML copied from eBay…</p>",
  "price": 199.99,
  "currency": "GBP",
  "stock": {
    "quantity": 4,
    "inStock": true
  },
  "images": ["https://i.ebayimg.com/images/g/abc/s-l1600.jpg"],
  "importedAt": "2025-11-19T12:00:00.000Z"
}
```

Modify `scripts/background.js#importProduct` if your WordPress plugin expects additional fields or different header names.

## Next steps

* Hook the WordPress endpoint up to validate the API key and persist the `_ebay_item_id` meta.
* Optionally add a lightweight review history so you can see the last few imports in the popup.
