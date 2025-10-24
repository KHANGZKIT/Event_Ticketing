import { getShowStats } from "./shows.stats.service.js";

export async function showStats(req, res, next) {
    try {
        const data = await getShowStats(req.params.id);
        res.json(data);
    } catch (e) {
        next(e);
    }

}