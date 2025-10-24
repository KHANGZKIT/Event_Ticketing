//Thong ke so lieu cua 1 show
import { prisma } from "@app/db";
import { expandSeatsFromTemplate, loadSeatMapTemplate } from "./shows.service.js";

export async function getShowStats(showId) {
    //1 Lay seat map tu show

    const show = await prisma.show.findUnique({
        where: { id: showId },
        select: { id: true, seatMapId: true }
    })

    if (!show || !show.seatMapId) {
        const e = new Error("Seatmap not found");
        e.status(404);
        throw e;
    }

    //Load seatmap template va dem tong ghe
    const tpl = await loadSeatMapTemplate(show.seatMapId);
    const totalSeats = expandSeatsFromTemplate(tpl).length;

    //Dem so ghe da ban 
    const sold = await prisma.ticket.count({
        where: { showId }
    })

    const held = 0;

    // Tinh available 
    const available = Math.max(totalSeats - held - sold, 0);

    return { showId, totalSeats, sold, held, available };

}