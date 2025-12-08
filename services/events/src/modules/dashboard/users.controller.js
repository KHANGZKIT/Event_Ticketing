import * as svc from "./users.service.js";

export async function listUsers(req, res) {
    try {
        const page = Math.max(parseInt(req.query.page || '1', 10), 1);
        const size = Math.min(Math.max(parseInt(req.query.size || '20', 10), 1), 100);
        const search = (req.query.search || '').trim();

        // SỬA LỖI: Gọi hàm thông qua biến 'svc'
        const result = await svc.findUsers({ page, size, search });

        const totalPages = Math.max(Math.ceil(result.total / result.pageSize), 1);

        return res.json({
            ...result,
            totalPages,
        });
    } catch (e) {
        console.error('[GET /dashboard/users] error:', e);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}