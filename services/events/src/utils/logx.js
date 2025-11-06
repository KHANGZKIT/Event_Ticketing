export function logx(evt, ctx = {}, lvl = 'info') {
    try {
        const rec = {
            t: new Date().toISOString(),
            lvl,
            evt,
            ...ctx,
        };
        // 1 dòng JSON
        console.log(JSON.stringify(rec));
    } catch {
        // fallback
        console.log(`[logx:${evt}]`, ctx);
    }
}
