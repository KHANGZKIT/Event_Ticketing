import { authGuard } from '../../middlewares/authGuard.js';
import { requireRole } from '../../middlewares/requireRole.js';
import * as ctrl from './shows.controller.js';
import { Router } from 'express';
const r = Router();

r.get('/:id', ctrl.getShow);
r.get('/:id/seatmap', ctrl.getSeatMap); //
r.get('/:id/availability', ctrl.getAvailability); // Check 

r.post('/', authGuard, requireRole('admin'), ctrl.createShow); 
r.patch('/:id', authGuard, requireRole('admin'), ctrl.updateShow);
r.delete('/:id', authGuard, requireRole('admin'), ctrl.deleteShow);

export default r;