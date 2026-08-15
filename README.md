# SEC 13F Institutional Holdings Tracker

Track new SEC Form 13F-HR filings — the quarterly disclosure every
institutional investment manager with $100M+ in U.S. equities must file,
listing what they hold.

Built for anyone doing "whale watching": tracking what big funds are
buying, spotting a new filer, or checking who else holds a stock you're
watching.

## Input

```json
{
  "keyword": "Berkshire Hathaway",
  "daysBack": 45,
  "maxResults": 50
}
```

| Field | Type | Description |
|---|---|---|
| `keyword` | string (optional) | Free-text search across the filing. Matches both the manager's own name **and** any company named in their reported holdings — searching `"Apple"` surfaces managers who hold Apple stock, not just companies named Apple. Leave blank for all new 13F filings market-wide. |
| `daysBack` | number | How many days back from today to search, by filing date. Default `45`, max `120`. 13F filings cluster around the 45-day-after-quarter-end deadline, so a wider window catches more filers. |
| `maxResults` | number | Max filings to return, most recently filed first. Default `50`, max `100`. |

## Output

One record per filing:

```json
{
  "accessionNumber": "0002150492-26-000004",
  "filerName": "BERKSHIRE HATHAWAY INC",
  "filerCik": "0001067983",
  "filerTickers": "BRK-A, BRK-B",
  "filingDate": "2026-08-14",
  "periodOfReport": "2026-06-30",
  "filingUrl": "https://www.sec.gov/Archives/edgar/data/1067983/000215049226000004-index.htm"
}
```

A search with no matches in the requested window returns no items but
is still billed once for the search.

## How it works

Direct calls to the official [SEC EDGAR full text search
API](https://www.sec.gov/edgar/search/) (`efts.sec.gov`), filtered to
Form 13F-HR filings. No proxy, no key, no scraping.

**Note:** 13F filings are two documents — a cover page (what this actor
indexes) and a separate "information table" listing the actual security
positions, share counts, and values. This actor tells you *who just
filed* and *when*; use `filingUrl` to open the full filing for the
line-by-line holdings.

## Pricing note

Billed per **search**, not per filing returned — one charge whether the
search returns 0 filings or 100.

## Related products

- [SEC 13D/13G Ownership Tracker](https://github.com/timmKal01/sec-13d-ownership-tracker) — 5%+ activist/passive stakes in a single company, rather than a manager's full portfolio
- [Insider Trading Alert](https://github.com/timmKal01/insider-trading-alert) — the officer/director equivalent (SEC Form 4)
