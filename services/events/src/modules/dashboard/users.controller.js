import * as svc from "./users.service.js";
// dashboard.controller.js (hoặc nơi bạn handle route /api/dashboard/users)
import { findUsers } from './users.service.js';

export async function listUsers(req, res) {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const size = Math.min(Math.max(parseInt(req.query.size || '20', 10), 1), 100);
    const search = (req.query.search || '').trim();

    const result = await findUsers({ page, size, search });
    const totalPages = Math.max(Math.ceil(result.total / result.pageSize), 1);

    return res.json({
        ...result,
        totalPages,
    });
}

