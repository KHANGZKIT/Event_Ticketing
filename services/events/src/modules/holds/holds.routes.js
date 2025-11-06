import { Router } from "express";
import * as ctrl from "./holds.redis.controller.js";
import { authGuard } from "../../middlewares/authGuard.js";

const r = Router();
// thin routes, logic lives in controller
r.post('/', authGuard, ctrl.createHold);
r.delete('/:id', authGuard, ctrl.releaseHold);

export default r;
