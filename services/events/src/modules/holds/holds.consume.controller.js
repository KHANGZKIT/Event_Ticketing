import { consumeHoldService } from './holds.consume.service.js';

export async function consumeHoldController(req, res) {
    try {
        const userId = req.userId;                 // gán bởi authGuard
        const holdId = req.params.id;
        const idemKey = req.get('Idempotency-Key') || null;

        if (!userId || !holdId) {
            return res.status(400).json({ ok: false, reason: 'invalid-input' });
        }

        const out = await consumeHoldService({ userId, holdId, idemKey });
        return res.status(201).json(out);
    } catch (e) {
        const code = e?.status || 500;
        return res.status(code).json({ error: { code, message: e.message } });
    }
}
