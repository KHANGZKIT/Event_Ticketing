import { prisma } from "@app/db";
import { CheckinFromQRSchema } from './tickets.schema.js';
import { verifyQR } from './tickets.qr.service.js';

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

/**
 * Check-in từ QR (staff/admin):
 * - Validate body {tid, sig}
 * - Verify HMAC
 * - Gọi checkinTicket (idempotent)
 * - Ghi audit log (best-effort)
 */
export async function checkinFromQRService(checkerId, body) {
    const { tid, sig } = CheckinFromQRSchema.parse(body);

    if (!verifyQR({ tid, sig })) {
        const e = new Error('Invalid QR'); e.status = 400; throw e;
    }

    const ticket = await checkinTicket(tid);

    // Audit log (không cản luồng nếu lỗi)
    try {
        await prisma.checkinLog.create({
            data: { ticketId: ticket.id, checkerId },
        });
    } catch (err) {
        console.warn('[checkin] audit log failed:', err.message);
    }

    return ticket;
}
