// Node script to stress /api/holds for race / idempotency tests
// Usage:
//   node scripts/race_holds.js <SHOW_ID> [--n=10] [--seats=A1,A2] [--token=Bearer xxx] [--idemPrefix=race] [--consume]
//
// Requires Node >=18 (global fetch). If Node <18 install undici or run in newer Node.

const { argv } = process;
if (typeof fetch === 'undefined') {
    console.error('Global fetch is not available. Run with Node >= 18 or install a fetch polyfill (undici).');
    process.exit(1);
}

function parseArg(name, def = null) {
    const p = argv.find(a => a.startsWith(`--${name}=`));
    return p ? p.split('=')[1] : def;
}

const showId = argv[2];
if (!showId) {
    console.error('Usage: node scripts\\race_holds.js <SHOW_ID> [--n=10] [--seats=A1,A2] [--token="Bearer ..."] [--idemPrefix=race] [--consume]');
    process.exit(1);
}

const N = Number(parseArg('n', '10'));
const seatsArg = parseArg('seats', 'A1,A2');
const seats = seatsArg.split(',').map(s => s.trim()).filter(Boolean);
const token = parseArg('token', null);
const idemPrefix = parseArg('idemPrefix', 'race');
const doConsume = !!parseArg('consume', null);

const url = 'http://localhost:4102/api/holds'; // adjust port if needed

const bodyTemplate = (idem) => JSON.stringify({
    // server expects user from authGuard; body.userId is ignored but harmless
    userId: 'test-client',
    showId,
    seats,
    ttlSec: 60
});

async function postHold(idem) {
    const headers = {
        'Content-Type': 'application/json',
        'Idempotency-Key': idem
    };
    if (token) headers['Authorization'] = token;
    try {
        const r = await fetch(url, { method: 'POST', headers, body: bodyTemplate(idem) });
        const json = await r.text().then(t => {
            try { return JSON.parse(t); } catch { return t; }
        });
        return { status: r.status, json, idem };
    } catch (err) {
        return { status: 0, error: String(err), idem };
    }
}

async function delHold(holdId) {
    const headers = {};
    if (token) headers['Authorization'] = token;
    try {
        const r = await fetch(`${url}/${encodeURIComponent(holdId)}`, { method: 'DELETE', headers });
        const json = await r.text().then(t => {
            try { return JSON.parse(t); } catch { return t; }
        });
        return { status: r.status, json };
    } catch (err) {
        return { status: 0, error: String(err) };
    }
}

(async () => {
    console.log('Running', N, 'parallel POST /api/holds -> showId=', showId, 'seats=', seats.join(','));
    const tasks = Array.from({ length: N }, (_, i) => postHold(`${idemPrefix}-${i}`));
    const out = await Promise.all(tasks);

    const byStatus = out.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
    }, {});

    console.log('Summary statuses:', byStatus);
    const created = out.filter(r => r.status === 201).map(r => {
        const h = r.json && r.json.holdId ? r.json.holdId : null;
        return { idem: r.idem, holdId: h, raw: r.json };
    });
    console.log('Created holds (201):', created);

    if (doConsume && created.length) {
        // for each created hold, call DELETE twice to check idempotency of release
        for (const c of created) {
            if (!c.holdId) continue;
            console.log(`\nReleasing hold ${c.holdId} first time:`);
            console.log(await delHold(c.holdId));
            console.log(`Releasing hold ${c.holdId} second time:`);
            console.log(await delHold(c.holdId));
        }
    } else if (doConsume) {
        console.log('No created holds to consume.');
    }

    process.exit(0);
})();
