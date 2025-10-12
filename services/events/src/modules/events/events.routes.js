import { Router } from "express";
import * as ctrl from "./events.controller.js";
import { authGuard } from "../../middlewares/authGuard.js";
import { requireRole } from "../../middlewares/requireRole.js";
const r = Router();

r.get('/', ctrl.listEvents);
r.get('/:id', ctrl.getEvent);

r.post('/', authGuard, requireRole('admin'), ctrl.createEvent);
r.patch('/:id', authGuard, requireRole('admin'), ctrl.updateEvent);
r.delete('/:id', authGuard, requireRole('admin'), ctrl.deleteEvent);

r.get('/:id/shows', ctrl.listShowsOfEvent);

export default r;