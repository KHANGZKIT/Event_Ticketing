import * as ctrl from './shows.controller.js';
import { Router } from 'express';
const r = Router();

r.get('/:id', ctrl.getShow);

export default r;