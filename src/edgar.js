const UA = 'Sec13fInstitutionalHoldingsTracker/0.1 (+contact: sec-13f-tracker-admin@example.com)';
const FTS_BASE = 'https://efts.sec.gov/LATEST/search-index';

const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 4;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retries transient failures (rate limits, upstream 5xx) instead of failing the whole run on one hiccup. */
async function secFetch(url) {
    let lastError;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        let res;
        try {
            res = await fetch(url, { headers: { 'User-Agent': UA } });
        } catch (err) {
            lastError = err;
            if (attempt < MAX_ATTEMPTS) await sleep(1000 * 2 ** (attempt - 1));
            continue;
        }
        if (res.ok) return res;
        if (!TRANSIENT_STATUSES.has(res.status)) {
            throw new Error(`SEC request failed: ${url} (${res.status})`);
        }
        lastError = new Error(`SEC request failed: ${url} (${res.status})`);
        if (attempt < MAX_ATTEMPTS) await sleep(1000 * 2 ** (attempt - 1));
    }
    throw lastError;
}

/** Parses an EDGAR display name like "BERKSHIRE HATHAWAY INC  (BRK-A, BRK-B)  (CIK 0001067983)". */
function parseFiler(displayName) {
    const cikMatch = displayName?.match(/^(.*?)\s*\(CIK (\d+)\)\s*$/);
    if (!cikMatch) return { name: displayName ?? null, tickers: null, cik: null };
    const cik = cikMatch[2];
    const tickerMatch = cikMatch[1].match(/^(.*?)\s*\(([A-Z0-9,.\- ]+)\)\s*$/);
    if (tickerMatch) return { name: tickerMatch[1].trim(), tickers: tickerMatch[2], cik };
    return { name: cikMatch[1].trim(), tickers: null, cik };
}

export async function fetchFilings({ keyword, startDate, endDate, limit }) {
    const params = new URLSearchParams({
        forms: '13F-HR',
        startdt: startDate.toISOString().slice(0, 10),
        enddt: endDate.toISOString().slice(0, 10),
        size: '100',
    });
    if (keyword) params.set('q', keyword);

    const res = await secFetch(`${FTS_BASE}?${params}`);
    const data = await res.json();
    const hits = data.hits?.hits ?? [];

    const byAccession = new Map();
    for (const hit of hits) {
        const s = hit._source;
        if (!byAccession.has(s.adsh)) byAccession.set(s.adsh, s);
    }

    return [...byAccession.values()]
        .sort((a, b) => b.file_date.localeCompare(a.file_date))
        .slice(0, limit)
        .map((s) => {
            const filer = parseFiler(s.display_names?.[0]);
            const cikNum = s.ciks?.[0]?.replace(/^0+/, '') || s.ciks?.[0];
            const accessionNoDashes = s.adsh.replace(/-/g, '');
            return {
                accessionNumber: s.adsh,
                filerName: filer.name,
                filerCik: filer.cik,
                filerTickers: filer.tickers,
                filingDate: s.file_date,
                periodOfReport: s.period_ending ?? null,
                filingUrl: `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accessionNoDashes}-index.htm`,
            };
        });
}
