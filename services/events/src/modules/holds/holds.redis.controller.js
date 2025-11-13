import * as svc from './holds.redis.service.js';
import { getIdem, setIdem } from './idempotency.js';

export async function createHold(req, res, next) {
    try {
        const userId = req.user?.id; // chỉ lấy từ authGuard
        if (!userId) {
            console.error('[POST /holds] Missing userId in req.user');
            return res.status(401).json({ error: { code: 401, message: 'Unauthorized' } });
        }

        const { showId, seats, ttlSec } = req.body || {};
        const idemKey = req.get('Idempotency-Key') || null;
        console.log('[POST /holds] Request:', { userId, idemKey, showId, seats, ttlSec });

        if (!showId || !Array.isArray(seats) || seats.length === 0) {
            console.error('[POST /holds] Invalid input:', { showId, seats });
            return res.status(400).json({ ok: false, reason: 'invalid-input', message: 'showId and seats array required' });
        }

        // lớp idempotency ngoài (tuỳ bạn có dùng hay không)
        let cached = null;
        try {
            cached = await getIdem(userId, idemKey);
            console.log('[idem:cache]', { hit: !!cached, redisKey: `idem:holds:${userId}:${idemKey}` });
        } catch (e) {
            console.warn('[POST /holds] Idempotency check error (continuing):', e.message);
        }
        if (cached) return res.status(200).json({ ...cached, idempotent: true });

        // gọi core service (service có idempotency riêng ở trong)
        console.log('[POST /holds] Calling createHold service...');
        const result = await svc.createHold(userId, { showId, seats, ttlSec }, { idempotencyKey: idemKey });

        // lưu idempotency (nếu có key)
        try {
            await setIdem(userId, idemKey, result);
        } catch (e) {
            console.warn('[POST /holds] Idempotency save error (non-critical):', e.message);
        }

        console.log('[POST /holds] Service result:', result);

        if (result && result.ok) return res.status(201).json(result);
        if (result && (result.reason === 'conflict' || result.reason === 'lock-failed')) {
            return res.status(409).json({
                ok: false,
                reason: result.reason,
                conflicts: result.conflicts || [],
                message: result.message || 'Seat(s) already held'
            });
        }
        if (result && result.reason === 'invalid-input') {
            return res.status(400).json(result);
        }
        if (result && result.reason === 'tx-failed') {
            return res.status(500).json(result);
        }
        return res.status(422).json(result || { ok: false, reason: 'unprocessable' });
    } catch (e) {
        console.error('[POST /holds] Unhandled error:', e);
        console.error('[POST /holds] Error stack:', e.stack);
        
        // Xử lý lỗi conflict đặc biệt
        if (e?.status === 409) {
            return res.status(409).json({
                ok: false,
                reason: 'conflict',
                conflicts: e.conflicts || [],
                message: e.message || 'Seat(s) already held'
            });
        }
        
        return res.status(e?.status || 500).json({ 
            ok: false,
            error: { 
                code: e?.status || 500, 
                message: e.message || 'Internal server error',
                details: process.env.NODE_ENV === 'development' ? e.stack : undefined
            } 
        });
    }
}

export async function releaseHold(req, res, next) {
    try {
        const holdId = req.params.id;
        if (!holdId) return res.status(400).json({ ok: false, reason: 'missing-holdId' });

        const result = await svc.releaseHold(holdId);
        return res.status(200).json(result);
    } catch (e) {
        console.error('[DELETE /holds/:id] error:', e);
        return res.status(e?.status || 500).json({ error: { code: e?.status || 500, message: e.message } });
    }
}
