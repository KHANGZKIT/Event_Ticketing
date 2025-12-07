import * as svc from './coupons.service.js';

export async function listCoupons(req, res, next) {
    try { res.json(await svc.listCoupons(req.query)); } catch (e) { next(e); }
}

export async function createCoupon(req, res, next) {
    try { res.status(201).json(await svc.createCoupon(req.body)); } catch (e) { next(e); }
}

export async function updateCoupon(req, res, next) {
    try { res.json(await svc.updateCoupon(req.params.id, req.body)); } catch (e) { next(e); }
}

export async function deleteCoupon(req, res, next) {
    try { res.json(await svc.deleteCoupon(req.params.id)); } catch (e) { next(e); }
}

export async function getCoupon(req, res, next) {
    try {
        const c = await svc.getCoupon(req.params.id);
        if (!c) return res.status(404).json({ error: { message: 'Coupon not found' } });
        res.json(c);
    } catch (e) { next(e); }
}

export async function validateCoupon(req, res, next) {
    try {
        const result = await svc.validateCouponByCode(req.params.code);
        res.json(result);
    } catch (e) {
        next(e);
    }
}
