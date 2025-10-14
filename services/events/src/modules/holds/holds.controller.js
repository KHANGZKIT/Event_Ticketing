import * as svc from './holds.service.js';

export const createHold = async (req, res, next) => {
    try {
        res.status(201).json(await svc.createHold(req.userId, req.body));
    }
    catch (e) {
        next(e);
    }
};

export const releaseHold = async (req, res, next) => {
    try {
        await svc.releaseHold(req.userId, req.params.id);
        res.status(204).end();
    }
    catch (e) {
        next(e);
    }
};
