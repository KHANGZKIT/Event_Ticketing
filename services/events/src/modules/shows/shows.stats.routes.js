import { Router } from "express";
import { authGuard } from "../../middlewares/authGuard.js";
import { requireRole } from "../../middlewares/requireRole.js";
import { showStats } from "./shows.stats.controller.js";

const r = Router();

r.get('/:id/stats', authGuard, requireRole('staff', 'admin'), showStats)

export default r;