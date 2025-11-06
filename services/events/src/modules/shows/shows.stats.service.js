//Thong ke so lieu cua 1 show
import { prisma } from "@app/db";
import { expandSeatsFromTemplate, loadSeatMapTemplate } from "./shows.service.js";
import { getHeldSeatByShow } from '../holds/holds.redis.service.js';
import { logx } from '../../utils/logx.js';

export async function getShowStats(showId) {
    // 1) Lấy show + seatMapId
    const show = await prisma.show.findUnique({
        where: { id: showId },
        select: { id: true, seatMapId: true },
    });

    if (!show || !show.seatMapId) {
        const e = new Error('Seatmap not found');
        e.status = 404;
        throw e;
    }

    // 2) Đếm tổng ghế từ template
    const tpl = await loadSeatMapTemplate(show.seatMapId);
    const seatsTotal = expandSeatsFromTemplate(tpl).length;

    // 3) Đếm SOLD: chỉ tính vé đã “sold” (vd: có orderId)
    const sold = await prisma.ticket.count({
        where: { showId, orderId: { not: null } },
    });

    // 4) HELD: lấy từ Redis
    const heldSet = await getHeldSeatByShow(showId);
    const held = heldSet.size;

    // 5) AVAILABLE
    const available = Math.max(seatsTotal - sold - held, 0);

    // log quan sát (1 dòng JSON)
    logx('shows.stats', { showId, seatsTotal, sold, held, available });

    // Trả về thống kê (kèm danh sách ghế held để FE test/ tô màu)
    return { showId, seatsTotal, sold, held, available, heldSeats: Array.from(heldSet) };
}
