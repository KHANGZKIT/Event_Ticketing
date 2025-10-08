import * as svc from './auth.service.js';

export async function register(req, res, next) {
    try {
        res.status(201).json(await svc.register(req.body));
    }
    catch (e) {
        next(e);
    }
}

export async function login(req, res, next) {
    try {
        res.json(await svc.login(req.body));
    }
    catch (e) {
        next(e);
    }
}

export async function me(req, res, next) {
    try {
        const user = await svc.getMe(req.userId);
        res.json(user);
    } catch (e) { next(e); }
}




