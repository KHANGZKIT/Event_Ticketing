import * as svc from './shows.service.js';
export const getShow = async (req, res, next) => {
    try {
        res.json(await svc, getShow(req.params.id));
    } catch (e) {
        next(e);
    }
}