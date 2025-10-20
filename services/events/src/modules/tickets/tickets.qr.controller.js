import { buildTicketQR } from "./tickets.qr.service.js";

// tickets.qr.controller.js
export async function qrcode(req, res, next) {
    try {
        const roles = req.userRoles || [];
        const pngBuffer = await buildTicketQR(req.params.id, req.userId, roles); // <-- lấy trực tiếp
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'private, max-age=300');
        res.send(pngBuffer);
    } catch (e) { next(e); }
}
