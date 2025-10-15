import { Router } from "express";
import { authGuard } from "../../middlewares/authGuard.js";
import { myOrders, orderDetail } from "./orders.query.controller.js";

const r = Router();
r.get('/my', authGuard, myOrders);
r.get('/:id', authGuard, orderDetail);
export default r;