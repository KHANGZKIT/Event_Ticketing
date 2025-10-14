import * as svc from './orders.service.js'

export async function checkout(req, res, next) {
    try {
        res.status(201).json(await svc.checkout(req.userId, req.body));
    } catch (e) {
        next(e);
    }
}