import { Router } from "express";
import * as ctrl from "./events.controller.js";
import { authGuard } from "../../middlewares/authGuard.js";
import { requireRole } from "../../middlewares/requireRole.js";
const r = Router();

r.get('/', ctrl.listEvents); //list Events
r.get('/:id', ctrl.getEvent);   // Lay event theo id

r.post('/', authGuard, requireRole('admin'), ctrl.createEvent); // Tao su kien  
r.patch('/:id', authGuard, requireRole('admin'), ctrl.updateEvent); // Cap Nhat su  kien
r.delete('/:id', authGuard, requireRole('admin'), ctrl.deleteEvent); //Xoa su kien

r.get('/:id/shows', ctrl.listShowsOfEvent);

export default r;