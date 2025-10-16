import { prisma } from "@app/db";
import QRCode from 'qrcode';
import crypto from 'node:crypto';

const QR_SECRET = process.env.QR_SECRET || 'dev-qr-secret';

function sign(tid) {
    return crypto.createHmac('sha256', QR_SECRET).update(tid).digest('hex');
}

export async function buildTicketQR(ticketId, requesterId, requesterRoles = []) {
    const t = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: {
            id: true, seatId: true, checkedInAt: true,
            order: { select: { id: true, userId: true, showId: true } }
        }
    });

    if (!t) {
        const e = new Error('Ticket not found');
        e.status = 404;
        throw e;
    }


    const canAll = new Set(requesterRoles).has('admin') || new Set(requesterRoles).has('staff');
    if (!canAll && t.order?.userId !== requesterId) {
        const e = new Error('Forbidden'); e.status = 403; throw e;
    }

    const payload = {
        tid: t.id,
        sig: sign(t.id)
    };

    const text = JSON.stringify(payload);
    const pngBuffer = await QRCode.toBuffer(text, { type: 'png', margin: 1, scale: 6 });

    return pngBuffer
}

export function verifyQR({ tid, sig }) 
{
    return sign(tid) === sig;
}