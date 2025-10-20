import { Router } from "express";
import { authGuard } from "../../middlewares/authGuard.js";
import { requireRole } from "../../middlewares/requireRole.js";
import { checkin, checkinFromQRController } from "./tickets.controller.js";

const r = Router();
r.post('/:id/checkin', authGuard, requireRole('staff', 'admin'), checkin);
r.post('/checkin-from-qr', authGuard, requireRole('staff', 'admin'), checkinFromQRController);

export default r;