import { Router } from 'express';
import * as ctrl from './seatmaps.controller.js';
import { authGuard } from '../../middlewares/authGuard.js';
import { requireRole } from '../../middlewares/requireRole.js';

const r = Router();

r.get('/', authGuard, requireRole('admin'), ctrl.listSeatmaps);
r.post('/', authGuard, requireRole('admin'), ctrl.createSeatmap);
r.get('/:id', authGuard, requireRole('admin'), ctrl.getSeatmap);
r.delete('/:id', authGuard, requireRole('admin'), ctrl.deleteSeatmap);

export default r;
