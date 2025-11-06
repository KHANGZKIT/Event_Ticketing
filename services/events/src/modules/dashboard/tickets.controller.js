import * as svc from "./tickets.service.js";

export async function getTicketsSummary(req, res) {
    try {
        const showId = String(req.query.showId || "");
        const hours = Number(req.query.hours || 24);
        if (!showId) return res.status(400).json({ ok: false, reason: "missing-showId" });

        const data = await svc.buildTicketsSummary({ showId, hours });
        return res.status(200).json({ ok: true, ...data });
    } catch (e) {
        console.error("[GET /dashboard/tickets/summary] error:", e);
        return res.status(500).json({ ok: false, error: e.message });
    }
}

export async function listTickets(req, res) {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const size = Math.min(Math.max(parseInt(req.query.size, 10) || 20, 1), 100);
        const order = (req.query.order === 'asc' ? 'asc' : 'desc');
        const showId = req.query.showId || undefined; // optional
        const status = req.query.status || undefined; // optional: 'sold' | 'unsold' | 'checkedin'
        const search = req.query.search || undefined;

        const data = await svc.findTickets({ showId, status, search, page, size, order });
        return res.status(200).json(data);
    } catch (e) {
        console.error('[GET /dashboard/tickets] error:', e);
        return res.status(400).json({ error: 'invalid-input' });
    }
}
