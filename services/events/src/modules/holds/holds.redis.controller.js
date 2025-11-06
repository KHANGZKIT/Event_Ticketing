import * as svc from './holds.redis.service.js';
import { getIdem, setIdem } from './idempotency.js';

export async function createHold(req, res, next) {
    try {
        const userId = req.user?.id; // chỉ lấy từ authGuard
        if (!userId) {
            return res.status(401).json({ error: { code: 401, message: 'Unauthorized' } });
        }

        const { showId, seats, ttlSec } = req.body || {};
        const idemKey = req.get('Idempotency-Key') || null;
        console.log('[idem:in]', { userId, idemKey, showId, seats, ttlSec });

        if (!showId || !Array.isArray(seats) || seats.length === 0) {
            return res.status(400).json({ ok: false, reason: 'invalid-input' });
        }

        // lớp idempotency ngoài (tuỳ bạn có dùng hay không)
        const cached = await getIdem(userId, idemKey);
        console.log('[idem:cache]', { hit: !!cached, redisKey: `idem:holds:${userId}:${idemKey}` });
        if (cached) return res.status(200).json({ ...cached, idempotent: true });

        // gọi core service (service có idempotency riêng ở trong)
        const result = await svc.createHold(userId, { showId, seats, ttlSec }, { idempotencyKey: idemKey });

        // lưu idempotency (nếu có key)
        await setIdem(userId, idemKey, result);

        console.log('[holds.result]', result);

        if (result && result.ok) return res.status(201).json(result);
        if (result && (result.reason === 'conflict' || result.reason === 'lock-failed')) {
            return res.status(409).json(result);
        }
        if (result && result.reason === 'invalid-input') {
            return res.status(400).json(result);
        }
        if (result && result.reason === 'tx-failed') {
            return res.status(500).json(result);
        }
        return res.status(422).json(result || { ok: false, reason: 'unprocessable' });
    } catch (e) {
        console.error('[POST /holds] error:', e);
        return res.status(e?.status || 500).json({ error: { code: e?.status || 500, message: e.message } });
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
