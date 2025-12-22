/**
 * Waitlist Controller
 * HTTP handlers for waitlist endpoints
 */

import * as waitlistService from './waitlist.service.js';
import { JoinWaitlistSchema, AcceptOfferSchema } from './waitlist.schema.js';

/**
 * POST /api/waitlist - Join waitlist
 */
export async function joinWaitlist(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
        }

        const { showId, seatCount } = JoinWaitlistSchema.parse(req.body);
        const result = await waitlistService.joinWaitlist(userId, showId, seatCount);

        res.json(result);
    } catch (err) {
        next(err);
    }
}

/**
 * DELETE /api/waitlist/:showId - Leave waitlist
 */
export async function leaveWaitlist(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
        }

        const { showId } = req.params;
        const result = await waitlistService.leaveWaitlist(userId, showId);

        res.json(result);
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/waitlist/:showId/position - Get my position in queue
 */
export async function getPosition(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
        }

        const { showId } = req.params;
        const result = await waitlistService.getWaitlistPosition(userId, showId);

        if (!result) {
            return res.status(404).json({
                error: { code: 'NOT_IN_WAITLIST', message: 'Bạn không có trong waitlist' }
            });
        }

        res.json(result);
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/waitlist/:showId/accept - Accept offer
 */
export async function acceptOffer(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
        }

        const { showId } = req.params;
        const result = await waitlistService.acceptOffer(userId, showId);

        res.json(result);
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/waitlist/:showId/decline - Decline offer
 */
export async function declineOffer(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
        }

        const { showId } = req.params;
        const result = await waitlistService.declineOffer(userId, showId);

        res.json(result);
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/waitlist/:showId/admin - Get waitlist entries (admin only)
 */
export async function getShowWaitlist(req, res, next) {
    try {
        // TODO: Add admin role check
        const { showId } = req.params;
        const result = await waitlistService.getShowWaitlist(showId);

        res.json(result);
    } catch (err) {
        next(err);
    }
}
