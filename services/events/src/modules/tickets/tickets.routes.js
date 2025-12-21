import { Router } from "express";
import { authGuard } from "../../middlewares/authGuard.js";
import { requireRole } from "../../middlewares/requireRole.js";
import { checkin, checkinFromQRController } from "./tickets.controller.js";
import { qrcode } from "./tickets.qr.controller.js";

const r = Router();

// QR code download - user can download their own ticket QR
r.get('/:id/qr', authGuard, qrcode);

// Check-in routes - staff/admin/inspector only
r.post('/:id/checkin', authGuard, requireRole('staff', 'admin', 'ticket_inspector'), checkin);
r.post('/checkin-from-qr', authGuard, requireRole('staff', 'admin', 'ticket_inspector'), checkinFromQRController);

export default r;