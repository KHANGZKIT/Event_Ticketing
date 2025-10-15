import * as svc from './tickets.service.js'

export async function checkin(req, res, next) {
    try {
        const ticket = await svc.checkinTicket(req.params.id);
        res.json(ticket);
    } catch (e) {
        next(e);
    }
}