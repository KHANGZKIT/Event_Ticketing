import * as svc from './orders.query.service.js';

export async function myOrders(req, res, next) {
    try {
        console.log('[myOrders] userId =', req.userId, 'query =', req.query);
        res.json(await svc.listMyOrders(req.userId, req.query))
    } catch (e) {
        next(e);
    }
}

export async function orderDetail(req, res, next) {
    try {

        const roles = req.userRoles || [];   // nếu authGuard có set
        res.json(await svc.getOrderDetail(req.params.id, req.userId, roles));
    } catch (e) { next(e); }
}