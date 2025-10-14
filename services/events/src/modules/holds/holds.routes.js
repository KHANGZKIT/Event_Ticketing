import { Router } from "express";
import * as ctrl from "./holds.controller.js";
import { authGuard } from "../../middlewares/authGuard.js";

const r = Router();

r.post('/', authGuard, ctrl.createHold);
r.delete('/:id', authGuard, ctrl.releaseHold);

export default r;
