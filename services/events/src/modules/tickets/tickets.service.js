import { prisma } from "@app/db";

/**
 * Check-in vé:
 * - nếu đã có checkedInAt thì trả lại trạng thái hiện tại (200)
 * - Nếu vé không tồn tại -> 404
 */

export async function checkinTicket(ticketId) {
    //Lay ve
    const t = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true, showId: true, orderId: true, seatId: true, checkedInAt: true }
    });

    if (!t) {
        const e = new Error('Ticket not found');
        e.status = 404;
        throw e;
    }
    //Da check in roi thi tra lai luon
    if (t.checkedInAt) {
        return t;
    }
    // Cap Nhat check-in
    return prisma.ticket.update({
        where: { id: ticketId },
        data: { checkedInAt: new Date() },
        select: { id: true, showId: true, seatId: true, orderId: true, checkedInAt: true }
    });
}