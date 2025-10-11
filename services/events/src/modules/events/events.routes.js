import { Router } from "express";
import * as ctrl from "./events.controller.js";
const r = Router();

r.get('/', ctrl.listEvents);
r.get('/:id', ctrl.getEvent);
r.get('/:id/shows', ctrl.listShowsOfEvent);

export default r;