import * as svc from './seatmaps.service.js';

export async function listSeatmaps(req, res, next) {
    try { res.json(await svc.listSeatmaps(req.query)); } catch (e) { next(e); }
}

export async function createSeatmap(req, res, next) {
    try { res.status(201).json(await svc.createSeatmap(req.body)); } catch (e) { next(e); }
}

export async function getSeatmap(req, res, next) {
    try {
        const sm = await svc.getSeatmap(req.params.id);
        if (!sm) return res.status(404).json({ error: { message: 'Seatmap not found' } });
        res.json(sm);
    } catch (e) { next(e); }
}

export async function deleteSeatmap(req, res, next) {
    try { res.json(await svc.deleteSeatmap(req.params.id)); } catch (e) { next(e); }
}
