import * as svc from './holds.redis.service.js'; // <-- đổi sang Redis

export async function createHold(req, res, next) {
    try { res.status(201).json(await svc.createHold(req.userId, req.body)); }
    catch (e) { next(e); }
}

export async function releaseHold(req, res, next) {
    try { await svc.releaseHold(req.userId, req.params.id); res.status(204).end(); }
    catch (e) { next(e); }
}
