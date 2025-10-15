import { Router } from "express";
import { authGuard } from "../../middlewares/authGuard.js";
import { requireRole } from "../../middlewares/requireRole.js";
import { checkin } from "./tickets.controller.js";

const r = Router();
r.post('/:id/checkin', authGuard, requireRole('staff', 'admin'), checkin);

export default r;