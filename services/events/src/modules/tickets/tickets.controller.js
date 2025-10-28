import * as svc from './tickets.service.js';
import { checkinFromQRService } from './tickets.service.js';

export async function checkin(req, res, next) {
    try {
        const ticket = await svc.checkinTicket(req.params.id);
        res.json(ticket);
    } catch (e) {
        next(e);
    }
}

export async function checkinFromQRController(req, res, next) {
    try {
        const ticket = await checkinFromQRService(req.userId, req.body);
        res.json(ticket);
    } catch (e) { next(e); }
}

