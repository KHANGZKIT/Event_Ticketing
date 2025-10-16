import { Router } from "express";
import { authGuard } from '../../middlewares/authGuard.js'
import { qrcode } from "./tickets.qr.controller.js";
const r = Router();
r.get('/:id/qrcode', authGuard, qrcode);
export default r;