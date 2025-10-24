import { Router } from "express";
import { authGuard } from "../../middlewares/authGuard.js";
import { myOrders, orderDetail } from "./orders.query.controller.js";

const r = Router();
r.get('/my', authGuard, myOrders); //Don Hang cua toi
r.get('/:id', authGuard, orderDetail); //Chi tiet don hang
export default r;