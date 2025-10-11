import * as svc from './events.service.js';
export const listEvents = async (req, res, next) => {
    try {
        res.json(await svc.listEvents(req.query));

    } catch (e) {
        next(e);
    }
};

export const getEvent = async (req, res, next) => {
    try {
        res.json(await svc.getEvent(req.params.id));
    } catch (e) {
        next(e);
    }
};

export const listShowsOfEvent = async (req, res, next) => {
    try {
        res.json(await svc.listShowsOfEvent(req.params.id, req.query));
    } catch (e) {
        next(e);
    }
};
